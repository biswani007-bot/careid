/**
 * CareID Doctor Web - Consultation & Treatment Offer Backend API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - 05. Doctor Portal:
 *   - GET /api/v1/doctors/treatment-offers (List authored treatment proposals)
 *   - POST /api/v1/doctors/patients/:patientProfileId/encounters (Document clinical encounter)
 *   - POST /api/v1/doctors/patients/:patientProfileId/medical-records (Create medical record)
 *   - PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId (Update clinical record)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records (Get patient records with pagination)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline (Get timeline)
 * - 10. Appointments:
 *   - GET /api/v1/appointments/doctor/me (Appointments scheduled for authenticated doctor)
 *   - GET /api/v1/appointments/:id (Get appointment details)
 *   - PUT /api/v1/appointments/:id/status (Update appointment status)
 * - 27. Healthcare Financing & Financial Assistance:
 *   - GET /api/v1/financing/options (List available healthcare financing options and partners)
 *   - GET /api/v1/financing/offers (List pre-approved healthcare financing offers)
 *   - POST /api/v1/financing/apply (Submit application for healthcare financing / EMI assistance)
 *   - GET /api/v1/financing/applications (List financing applications)
 */

import { apiClient } from './apiClient';
import { cleanClinicalNotes, extractCleanClinicalIndication } from '@/utils/clinicalDataSanitizer';
import { treatmentOfferService, TreatmentOfferDTO } from './treatmentOfferService';

export interface ClinicalEncounterPayload {
  title: string;
  chiefComplaint: string;
  clinicalNotes: string;
  treatmentPlan: string;
  followUpInstructions?: string;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | string;
  encounter?: {
    providerName?: string;
    facilityName?: string;
    encounterType?: string;
    encounterDate?: string;
  };
  diagnoses?: Array<{
    description: string;
    code: string;
    type: 'PRIMARY' | 'SECONDARY' | string;
    status: 'ACTIVE' | 'RESOLVED' | string;
  }>;
  vitalSigns?: {
    heightCm?: number;
    weightKg?: number;
    systolicBp?: number;
    diastolicBp?: number;
    pulseBpm?: number;
    respirationRate?: number;
    temperatureC?: number;
    bloodSugarMgDl?: number;
    oxygenSaturation?: number;
  };
  procedures?: Array<{
    name: string;
    code: string;
    performedAt: string;
    notes?: string;
  }>;
}

export interface FinancingOption {
  id: string;
  partnerName: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  tenureMonths: number[];
  interestRate: number;
  processingFee: number;
  features: string[];
  isDemonstrationCatalog?: boolean;
  disclaimer?: string;
}

export interface FinancingApplicationPayload {
  optionId: string;
  facilityId?: string;
  treatmentName: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyIncome: number;
  employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS' | string;
  panOrNationalId: string;
  notes?: string;
}

export interface ConsultationItem {
  id: string;
  appointmentId?: string;
  offerId?: string;
  patientProfileId: string;
  patientName: string;
  patientMrn: string;
  patientGender?: string;
  patientPhone?: string;
  patientAge?: string;
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: 'DRAFT' | 'DISPATCHED' | 'PATIENT_REVIEWING' | 'RATIFIED_ACCEPTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED' | 'SCHEDULED' | 'PROCEDURE_READY' | 'COMPLETED' | string;
  appointmentDate: string;
  appointmentTime?: string;
  facilityName: string;
  doctorName: string;
  doctorSpecialty?: string;
  cptCode?: string;
  procedureName?: string;
  totalCost?: number;
  netPayable?: number;
  createdAt?: string;
}

export interface ConsultationMetrics {
  total: number;
  active: number;
  accepted: number;
  completed: number;
}

export const consultationService = {
  /**
   * List all consultations and appointments for current authenticated doctor.
   * Merges live appointments (`GET /api/v1/appointments/doctor/me`) with live
   * authored treatment proposals (`GET /api/v1/doctors/treatment-offers`).
   */
  async listConsultations(): Promise<ConsultationItem[]> {
    const consultations: ConsultationItem[] = [];

    // 1. Fetch live appointments from backend
    let rawAppts: Record<string, unknown>[] = [];
    try {
      const apptRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
      if (Array.isArray(apptRes.data)) {
        rawAppts = apptRes.data as Record<string, unknown>[];
      } else if (apptRes.data && typeof apptRes.data === 'object' && Array.isArray((apptRes.data as { data: unknown[] }).data)) {
        rawAppts = (apptRes.data as { data: Record<string, unknown>[] }).data;
      }
    } catch {
      // Continue even if appointments call fails
    }

    // 2. Fetch live treatment offers authored by current doctor
    let rawOffers: TreatmentOfferDTO[] = [];
    try {
      const offersRes = await treatmentOfferService.listTreatmentOffers();
      if (Array.isArray(offersRes)) {
        rawOffers = offersRes;
      } else if (offersRes && typeof offersRes === 'object' && Array.isArray((offersRes as { data?: TreatmentOfferDTO[] }).data)) {
        rawOffers = (offersRes as { data: TreatmentOfferDTO[] }).data;
      }
    } catch {
      // Inline fallback directly via apiClient if treatmentOfferService encounters issues
      try {
        const toRes = await apiClient.get<unknown>('/api/v1/doctors/treatment-offers');
        if (Array.isArray(toRes.data)) {
          rawOffers = toRes.data as TreatmentOfferDTO[];
        } else if (toRes.data && typeof toRes.data === 'object' && Array.isArray((toRes.data as { data?: TreatmentOfferDTO[] }).data)) {
          rawOffers = (toRes.data as { data: TreatmentOfferDTO[] }).data;
        }
      } catch {
        // Continue with empty offers if call fails
      }
    }

    // 3. Normalize live appointments into ConsultationItem[]
    for (const appt of rawAppts) {
      const p = (appt.patient as Record<string, unknown>) || {};
      const pId = String(p.id || appt.patientProfileId || appt.patientId || '');
      if (!pId) continue;

      const firstName = String(p.firstName || '');
      const lastName = String(p.lastName || '');
      const fullName = (p.fullName as string) || `${firstName} ${lastName}`.trim() || 'Patient Record';
      const mrn = String(p.mrn || p.patientNumber || appt.patientMrn || '');
      const gender = (p.gender as string) || (appt.gender as string) || undefined;
      const phone = (p.phone as string) || (appt.phone as string) || undefined;

      const fac = (appt.facility as Record<string, unknown>) || {};
      const facilityName = String(fac.name || appt.facilityName || '');

      const doc = (appt.doctor as Record<string, unknown>) || {};
      const doctorName = String(doc.fullName || appt.doctorName || '');
      const doctorSpecialty = (doc.specialty as string) || (doc.primarySpecialization as string) || (appt.doctorSpecialty as string) || undefined;

      const apptDate = String(appt.appointmentDate || '');
      const apptTime = String(appt.startTime || appt.appointmentTime || '');
      const rawStatus = String(appt.status || 'CONFIRMED').toUpperCase();

      let status: ConsultationItem['status'] = 'CONFIRMED';
      if (rawStatus === 'SCHEDULED' || rawStatus === 'CONFIRMED') {
        status = 'SCHEDULED';
      } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'ARRIVED') {
        status = 'IN_PROGRESS';
      } else if (rawStatus === 'COMPLETED') {
        status = 'COMPLETED';
      } else if (rawStatus === 'CANCELLED' || rawStatus === 'NO_SHOW') {
        status = 'CANCELLED';
      }

      consultations.push({
        id: String(appt.id || `appt-${pId}`),
        appointmentId: String(appt.id || ''),
        patientProfileId: pId,
        patientName: fullName,
        patientMrn: mrn,
        patientGender: gender,
        patientPhone: phone,
        title: String(appt.reason || appt.title || 'Clinical Consultation'),
        chiefComplaint: appt.notes ? cleanClinicalNotes(String(appt.notes)) : undefined,
        status,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        facilityName,
        doctorName,
        doctorSpecialty,
        cptCode: (appt.cptCode as string) || (appt.procedureCode as string) || undefined,
        procedureName: (appt.procedureName as string) || (appt.reason as string) || undefined,
        offerStatus: undefined, // Will be bound if matching treatment offer exists
        createdAt: String(appt.createdAt || ''),
      });
    }

    // 4. Merge live treatment offers into consultation items
    for (const offer of rawOffers) {
      const primaryProc = Array.isArray(offer.procedures) && offer.procedures.length > 0 ? offer.procedures[0] : null;
      const procCode = primaryProc?.procedureCode || undefined;
      const procName = Array.isArray(offer.procedures) && offer.procedures.length > 0
        ? offer.procedures.map((pr) => pr.procedureName).filter(Boolean).join(', ')
        : primaryProc?.procedureName || undefined;

      let normalizedOfferStatus: ConsultationItem['offerStatus'];
      if (offer.status === 'RATIFIED_ACCEPTED' || offer.status === 'ACCEPTED') {
        normalizedOfferStatus = 'ACCEPTED';
      } else if (offer.status === 'DRAFT') {
        normalizedOfferStatus = 'DRAFT';
      } else if (offer.status === 'DISPATCHED' || offer.status === 'PATIENT_REVIEWING') {
        normalizedOfferStatus = 'DISPATCHED';
      } else if ((offer.status as string) === 'COMPLETED') {
        normalizedOfferStatus = 'COMPLETED';
      } else {
        normalizedOfferStatus = offer.status;
      }

      const existing = consultations.find(
        (c) =>
          (offer.encounterId && c.appointmentId === offer.encounterId) ||
          c.patientProfileId === offer.patientProfileId ||
          c.offerId === offer.id
      );

      if (existing) {
        existing.offerId = offer.id;
        existing.offerStatus = normalizedOfferStatus;
        if (!existing.cptCode && procCode) existing.cptCode = procCode;
        if (!existing.procedureName && procName) existing.procedureName = procName;
        if (!existing.facilityName && offer.facilityName) existing.facilityName = offer.facilityName;
        if (!existing.chiefComplaint && offer.clinicalIndication) {
          existing.chiefComplaint = extractCleanClinicalIndication(offer.clinicalIndication, existing.procedureName);
        }
        if (offer.grossEstimate !== undefined) existing.totalCost = offer.grossEstimate;
        if (offer.netPayable !== undefined) existing.netPayable = offer.netPayable;
      } else {
        const patientName = offer.patientName || 'Patient Record';
        const patientMrn = (offer as { patientMrn?: string; patient?: { mrn?: string } }).patientMrn ||
          (offer as { patient?: { mrn?: string } }).patient?.mrn || '';
        const patientGender = (offer as { patientGender?: string; patient?: { gender?: string } }).patientGender ||
          (offer as { patient?: { gender?: string } }).patient?.gender || undefined;
        const dateStr = offer.createdAt ? String(offer.createdAt).split('T')[0] : '';
        const timeStr = offer.createdAt
          ? new Date(offer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        let consultStatus: ConsultationItem['status'] = 'SCHEDULED';
        if (offer.status === 'RATIFIED_ACCEPTED' || offer.status === 'ACCEPTED') {
          consultStatus = 'IN_PROGRESS';
        } else if ((offer.status as string) === 'COMPLETED') {
          consultStatus = 'COMPLETED';
        } else if (offer.status === 'CANCELLED' || offer.status === 'DECLINED') {
          consultStatus = 'CANCELLED';
        }

        const cleanIndication = extractCleanClinicalIndication(offer.clinicalIndication, procName);

        consultations.unshift({
          id: offer.id,
          offerId: offer.id,
          patientProfileId: offer.patientProfileId,
          patientName,
          patientMrn,
          patientGender,
          title: offer.offerNumber ? `Treatment Offer ${offer.offerNumber}` : cleanIndication,
          chiefComplaint: cleanIndication,
          clinicalNotes: cleanClinicalNotes(offer.clinicalNotes),
          treatmentPlan: offer.termsAndConditions,
          status: consultStatus,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          facilityName: offer.facilityName || '',
          doctorName: offer.doctorName || '',
          doctorSpecialty: (offer as { doctorSpecialty?: string }).doctorSpecialty,
          cptCode: procCode,
          procedureName: procName,
          offerStatus: normalizedOfferStatus,
          totalCost: offer.grossEstimate,
          netPayable: offer.netPayable,
          createdAt: String(offer.createdAt || new Date().toISOString()),
        });
      }
    }

    // 5. Fetch medical records concurrently for assigned patients
    if (consultations.length > 0) {
      const uniquePatientIds = Array.from(new Set(consultations.map((c) => c.patientProfileId)));
      await Promise.allSettled(
        uniquePatientIds.map(async (pId) => {
          try {
            const recRes = await apiClient.get<Array<Record<string, unknown>>>(
              `/api/v1/doctors/patients/${encodeURIComponent(pId)}/medical-records`
            );
            const records = Array.isArray(recRes.data)
              ? recRes.data
              : recRes.data && typeof recRes.data === 'object' && Array.isArray((recRes.data as { data?: unknown[] }).data)
              ? (recRes.data as { data: Record<string, unknown>[] }).data
              : [];

            for (const rec of records) {
              const match = consultations.find((c) => c.patientProfileId === pId);
              if (match) {
                if (rec.clinicalNotes && !match.clinicalNotes) match.clinicalNotes = String(rec.clinicalNotes);
                if (rec.treatmentPlan && !match.treatmentPlan) match.treatmentPlan = String(rec.treatmentPlan);
                if (rec.title && match.title === 'Clinical Consultation') match.title = String(rec.title);
              }
            }
          } catch {
            // Ignore individual patient record errors
          }
        })
      );
    }

    return consultations;
  },

  /**
   * Helper method to compute dynamic dashboard metrics from consultation items.
   */
  calculateMetrics(items: ConsultationItem[]): ConsultationMetrics {
    const total = items.length;
    const active = items.filter(
      (c) => c.status === 'SCHEDULED' || c.status === 'CONFIRMED' || c.status === 'IN_PROGRESS'
    ).length;
    const accepted = items.filter(
      (c) =>
        c.offerStatus === 'ACCEPTED' ||
        c.offerStatus === 'RATIFIED_ACCEPTED' ||
        c.offerStatus === 'PROCEDURE_READY'
    ).length;
    const completed = items.filter(
      (c) => c.status === 'COMPLETED' || c.offerStatus === 'COMPLETED'
    ).length;

    return { total, active, accepted, completed };
  },

  /**
   * Query consultations and calculate dynamic metrics in a single operation.
   */
  async getConsultationMetrics(): Promise<ConsultationMetrics> {
    const items = await this.listConsultations();
    return this.calculateMetrics(items);
  },

  /**
   * Document a clinical encounter live on backend.
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/encounters
   */
  async createClinicalEncounter(
    patientProfileId: string,
    payload: ClinicalEncounterPayload
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/encounters`,
      payload
    );
    return response.data;
  },

  /**
   * Create medical record live on backend.
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/medical-records
   */
  async createMedicalRecord(
    patientProfileId: string,
    payload: Partial<ClinicalEncounterPayload>
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records`,
      payload
    );
    return response.data;
  },

  /**
   * Update clinical notes documented by doctor live on backend.
   * Endpoint: PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId
   */
  async updateClinicalEncounter(
    patientProfileId: string,
    recordId: string,
    payload: {
      title?: string;
      chiefComplaint?: string;
      clinicalNotes?: string;
      treatmentPlan?: string;
      followUpInstructions?: string;
      status?: string;
    }
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.put<Record<string, unknown>>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records/${encodeURIComponent(recordId)}`,
      payload
    );
    return response.data;
  },

  /**
   * Get available healthcare financing options from backend API.
   * Endpoint: GET /api/v1/financing/options
   */
  async getFinancingOptions(): Promise<FinancingOption[]> {
    const response = await apiClient.get<FinancingOption[] | { data: FinancingOption[] }>('/api/v1/financing/options');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && typeof response.data === 'object' && Array.isArray((response.data as { data: FinancingOption[] }).data)) {
      return (response.data as { data: FinancingOption[] }).data;
    }
    return [];
  },

  /**
   * Get pre-approved financing offers for patient.
   * Endpoint: GET /api/v1/financing/offers
   */
  async getFinancingOffers(): Promise<FinancingOption[]> {
    const response = await apiClient.get<FinancingOption[] | { data: FinancingOption[] }>('/api/v1/financing/offers');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && typeof response.data === 'object' && Array.isArray((response.data as { data: FinancingOption[] }).data)) {
      return (response.data as { data: FinancingOption[] }).data;
    }
    return [];
  },

  /**
   * Submit healthcare financing application.
   * Endpoint: POST /api/v1/financing/apply
   */
  async applyForFinancing(payload: FinancingApplicationPayload): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>('/api/v1/financing/apply', payload);
    return response.data;
  },

  /**
   * List healthcare financing applications.
   * Endpoint: GET /api/v1/financing/applications
   */
  async getFinancingApplications(): Promise<Array<Record<string, unknown>>> {
    const response = await apiClient.get<{ data?: Array<Record<string, unknown>> }>('/api/v1/financing/applications');
    const payload = response.data;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
    return [];
  },

  /**
   * Transition appointment status live on backend.
   * Endpoint: PUT /api/v1/appointments/:id/status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
    notes?: string
  ): Promise<void> {
    await apiClient.put(`/api/v1/appointments/${encodeURIComponent(appointmentId)}/status`, {
      status,
      notes: notes || `Status updated to ${status} by attending physician`,
    });
  },
};
