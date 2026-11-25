/**
 * CareID Doctor Web - Prescription & Clinical History Backend API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - 05. Doctor Portal:
 *   - GET /api/v1/doctors/patients/:patientProfileId/prescriptions (List prescriptions for authorized patient)
 *   - POST /api/v1/doctors/patients/:patientProfileId/prescriptions (Create prescription for authorized patient)
 *   - GET /api/v1/doctors/patients/:patientProfileId/admissions (List hospital admissions for authorized patient)
 *   - POST /api/v1/doctors/patients/:patientProfileId/admissions (Record hospital admission for authorized patient)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline (Unified chronological timeline)
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records (Longitudinal medical records)
 * - 08. Medical Records (General, Dental & Vision):
 *   - GET /api/v1/prescriptions/:prescriptionId (Get detailed prescription by UUID)
 *   - POST /api/v1/prescriptions/:prescriptionId/refill (Authorize and record a prescription refill)
 *   - GET /api/v1/prescriptions/:prescriptionId/export (Export clinical prescription summary)
 *   - PATCH /api/v1/prescriptions/:prescriptionId/discontinue (Discontinue active prescription)
 */

import { apiClient, ApiResponse, ApiDownloadResult, triggerBrowserDownload } from './apiClient';
import { MedicalRecord, MedicalAttachment, TimelineEvent } from './patientService';
import {
  convertUnifiedJsonToCsv,
  ConvertCsvResult,
  UnifiedExportData,
} from '@/utils/medicalRecordCsv';

export { triggerBrowserDownload, convertUnifiedJsonToCsv };
export type { ApiDownloadResult, ConvertCsvResult, UnifiedExportData };

export interface BackendMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

export interface BackendPrescription {
  id: string;
  patientProfileId: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  reportDate?: string;
  prescribedBy?: string;
  doctorName?: string;
  providerName?: string;
  facilityName?: string;
  medications: BackendMedication[];
  tags?: string[];
  notes?: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  attachments?: MedicalAttachment[];
  pickupReminderEnabled?: boolean;
  pickupReminderHours?: number;
  collected?: boolean;
  collectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalAdmissionDiagnosis {
  id: string;
  medicalRecordId?: string;
  code?: string | null;
  description: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface HospitalAdmission {
  id: string;
  medicalRecordId?: string;
  patientProfileId: string;
  title: string;
  encounterType: string;
  encounterDate: string;
  dischargeDate?: string;
  facilityName?: string;
  providerName?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  status: string;
  diagnoses?: HospitalAdmissionDiagnosis[];
  ward?: string;
  roomBed?: string;
  admissionType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalAdmissionPayload {
  title: string;
  admissionDate: string;
  dischargeDate?: string;
  admissionType?: string;
  reasonForAdmission: string;
  admittingDiagnosis: string;
  ward?: string;
  roomBed?: string;
  facilityName?: string;
  attendingDoctorName?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  recordId?: string;
  patientProfileId?: string;
  patientName?: string;
  isElectronicRx: boolean;
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  status: string;
  statusType: 'active' | 'completed';
  prescriber: string;
  date?: string;
  notes?: string;
  instructions?: string;
  facilityName?: string;
  refillCount?: number;
  pickupReminderEnabled?: boolean;
  pickupReminderHours?: number;
  collected?: boolean;
  collectedAt?: string;
}

export interface CreatePrescriptionPayload {
  title?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration?: string;
  indication: string;
  instructions?: string;
  status?: string;
  providerName?: string;
  facilityName?: string;
  pickupReminderEnabled?: boolean;
  pickupReminderHours?: number;
  collected?: boolean;
  collectedAt?: string;
}

export interface PrescriptionExportData {
  prescriptionId: string;
  rxNumber?: string;
  issuedAt?: string;
  patient?: {
    fullName: string;
    mrn: string;
  };
  prescriber?: {
    fullName: string;
    specialization?: string;
  };
  facilityName?: string;
  medications?: BackendMedication[];
  status?: string;
  disclaimer?: string;
  instructions?: Record<string, unknown> | string;
}

export interface ParsedPrescriptionDetails {
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
}

/**
 * Intelligent regex parser to extract dosage, frequency, and duration from
 * treatment plans and clinical orders when converting unstructured notes.
 */
export function parseTreatmentPlan(treatmentPlan: string, fallbackTitle: string): ParsedPrescriptionDetails {
  if (!treatmentPlan || !treatmentPlan.trim()) {
    return {
      medicine: fallbackTitle || 'Clinical Regimen',
      dose: '—',
      frequency: 'As directed',
      duration: '—',
    };
  }

  const cleanPlan = treatmentPlan.trim();

  // If delimited by bullet or bullet-like separators (e.g., "Atorvastatin 20mg • Once daily • 90 days")
  const parts = cleanPlan.split(/\s*[•|;]\s*/);
  if (parts.length >= 2) {
    const medPart = parts[0].trim();
    const doseMatch = medPart.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|tablets?|capsules?))/i);
    const dose = doseMatch ? doseMatch[1] : (parts[1] && parts[1].match(/\d+\s*(?:mg|mcg|g|ml)/i) ? parts[1].trim() : '—');
    const medicine = doseMatch ? medPart.replace(doseMatch[0], '').trim() : medPart;

    return {
      medicine: medicine || medPart,
      dose: dose,
      frequency: parts[1] || 'As directed',
      duration: parts[2] || '—',
    };
  }

  const doseRegex = /(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units?|tablets?|capsules?))/i;
  const doseMatch = cleanPlan.match(doseRegex);
  const dose = doseMatch ? doseMatch[1].trim() : '—';

  const freqRegex = /(once\s+daily|twice\s+daily|thrice\s+daily|three\s+times\s+daily|every\s+\d+\s+hours?|daily|bid|tid|qid|prn|as\s+needed|at\s+bedtime|q\d+h|weekly)/i;
  const freqMatch = cleanPlan.match(freqRegex);
  const frequency = freqMatch ? freqMatch[1].trim() : 'As directed';

  const durRegex = /(?:for\s+)?(\d+\s+(?:days?|weeks?|months?)|ongoing)/i;
  const durMatch = cleanPlan.match(durRegex);
  const duration = durMatch ? durMatch[1].trim() : '—';

  const firstSentence = cleanPlan.split(/[.;\n]/)[0].trim();
  let medicine = firstSentence;
  if (doseMatch) medicine = medicine.replace(doseMatch[0], '').trim();
  if (freqMatch) medicine = medicine.replace(freqMatch[0], '').trim();
  medicine = medicine.replace(/^prescribe(?:d)?\s+/i, '').replace(/^[•\s-]+/, '').trim();

  return {
    medicine: medicine || fallbackTitle || 'Prescription Order',
    dose,
    frequency,
    duration,
  };
}

/**
 * Universal safe unwrapper for BackendPrescription arrays regardless of backend envelope nesting
 */
export function unwrapPrescriptions(rawData: unknown): BackendPrescription[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData as BackendPrescription[];
  if (typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as BackendPrescription[];
    if (Array.isArray(obj.prescriptions)) return obj.prescriptions as BackendPrescription[];
    if (Array.isArray(obj.items)) return obj.items as BackendPrescription[];
    if (obj.data && typeof obj.data === 'object') {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data as BackendPrescription[];
      if (Array.isArray(nested.items)) return nested.items as BackendPrescription[];
      if (Array.isArray(nested.prescriptions)) return nested.prescriptions as BackendPrescription[];
    }
  }
  return [];
}

/**
 * Universal safe unwrapper for HospitalAdmission arrays regardless of backend envelope nesting
 */
export function unwrapAdmissions(rawData: unknown): HospitalAdmission[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData as HospitalAdmission[];
  if (typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as HospitalAdmission[];
    if (Array.isArray(obj.admissions)) return obj.admissions as HospitalAdmission[];
    if (Array.isArray(obj.items)) return obj.items as HospitalAdmission[];
    if (obj.data && typeof obj.data === 'object') {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data as HospitalAdmission[];
      if (Array.isArray(nested.items)) return nested.items as HospitalAdmission[];
      if (Array.isArray(nested.admissions)) return nested.admissions as HospitalAdmission[];
    }
  }
  return [];
}

export const prescriptionService = {
  /**
   * Fetch authentic prescriptions from the backend
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/prescriptions
   */
  async getPatientPrescriptions(patientProfileId: string): Promise<BackendPrescription[]> {
    if (!patientProfileId) return [];

    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/prescriptions?page=1&limit=50`
      );

      const payload = response.data !== undefined ? response.data : response;
      return unwrapPrescriptions(payload);
    } catch (err: unknown) {
      console.warn('[prescriptionService] Failed to load prescriptions:', err);
      throw err;
    }
  },

  /**
   * Submit a new authentic prescription to the live backend
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/prescriptions
   */
  async createPrescription(
    patientProfileId: string,
    payload: CreatePrescriptionPayload
  ): Promise<BackendPrescription> {
    if (!patientProfileId) {
      throw new Error('Patient Profile ID is required to create a prescription.');
    }

    let durationDays = 14;
    if (payload.duration) {
      const parsedDays = parseInt(payload.duration.replace(/\D/g, ''), 10);
      if (!isNaN(parsedDays) && parsedDays > 0) durationDays = parsedDays;
    }

    const requestBody = {
      diagnosisCode: payload.indication?.trim() || undefined,
      notes: payload.instructions?.trim() || `Prescription for ${payload.indication?.trim() || 'General indication'}`,
      pickupReminderEnabled: Boolean(payload.pickupReminderEnabled),
      pickupReminderHours: payload.pickupReminderHours ? Number(payload.pickupReminderHours) : 2,
      items: [
        {
          drugName: payload.medicationName.trim(),
          dosage: payload.dosage.trim(),
          form: 'Tablet',
          route: 'ORAL',
          frequency: payload.frequency.trim(),
          durationDays,
          instructions: payload.instructions?.trim() || undefined,
        },
      ],
    };

    const response = await apiClient.post<BackendPrescription>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/prescriptions`,
      requestBody
    );

    const result = (response.data as unknown as { data?: BackendPrescription })?.data || response.data;
    return result;
  },

  /**
   * Authorize a prescription refill live on the backend
   * Endpoint: POST /api/v1/prescriptions/:prescriptionId/refill
   */
  async authorizeRefill(
    prescriptionId: string,
    quantity = 1,
    notes?: string
  ): Promise<Record<string, unknown>> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to authorize a refill.');
    }

    const payload = {
      quantity,
      notes: notes || 'Standard refill authorized by attending clinician',
    };

    const response = await apiClient.post<Record<string, unknown>>(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/refill`,
      payload
    );

    return response.data;
  },

  /**
   * Discontinue an active prescription with clinical justification
   * Endpoint: PATCH /api/v1/prescriptions/:prescriptionId/discontinue
   */
  async discontinuePrescription(
    prescriptionId: string,
    reason: string,
    notes?: string
  ): Promise<Record<string, unknown>> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to discontinue.');
    }

    const payload = {
      reason,
      notes: notes || undefined,
    };

    const response = await apiClient.patch<Record<string, unknown>>(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/discontinue`,
      payload
    );

    return response.data;
  },

  /**
   * Mark prescription as collected by patient/pharmacy (CR-08)
   * Endpoint: PATCH /api/v1/prescriptions/:prescriptionId/collect
   */
  async markPrescriptionCollected(
    patientProfileId: string,
    prescriptionId: string
  ): Promise<any> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to mark as collected.');
    }

    try {
      const response = await apiClient.patch<any>(
        `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/collect`
      );
      return (response.data as any)?.data || response.data;
    } catch {
      const response = await apiClient.patch<any>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/prescriptions/${encodeURIComponent(prescriptionId)}/collect`
      );
      return (response.data as any)?.data || response.data;
    }
  },

  /**
   * Update prescription pickup reminder configuration (CR-08)
   * Endpoint: PATCH /api/v1/prescriptions/:prescriptionId/reminder
   */
  async updateReminderSettings(
    prescriptionId: string,
    enabled?: boolean,
    hours?: number
  ): Promise<any> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to update reminder settings.');
    }

    const payload: { enabled?: boolean; hours?: number } = {};
    if (enabled !== undefined) payload.enabled = enabled;
    if (hours !== undefined) payload.hours = hours;

    const response = await apiClient.patch<any>(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/reminder`,
      payload
    );
    return (response.data as any)?.data || response.data;
  },

  /**
   * Export complete unified clinical medical record for authorized patient
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records/export?format=PDF
   */
  async exportPatientMedicalRecord(
    patientProfileId: string,
    format: 'PDF' | 'JSON' = 'PDF'
  ): Promise<ApiDownloadResult> {
    if (!patientProfileId) {
      throw new Error('Patient Profile ID is required to export medical record.');
    }

    const endpoint = `/api/v1/doctors/patients/${encodeURIComponent(
      patientProfileId
    )}/medical-records/export?format=${format}`;

    return await apiClient.download(endpoint, {
      headers: {
        Accept: format === 'PDF' ? 'application/pdf, application/json, */*' : 'application/json',
      },
    });
  },

  /**
   * Export complete patient medical record as an RFC 4180 normalized CSV file
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records/export?format=JSON
   */
  async exportPatientMedicalRecordCsv(
    patientProfileId: string,
    fallbackPatientName = ''
  ): Promise<ConvertCsvResult> {
    if (!patientProfileId) {
      throw new Error('Patient Profile ID is required to export medical record.');
    }

    const endpoint = `/api/v1/doctors/patients/${encodeURIComponent(
      patientProfileId
    )}/medical-records/export?format=JSON`;

    const response = await apiClient.get<UnifiedExportData>(endpoint, {
      Accept: 'application/json',
    });

    const exportData = (response.data as unknown as { data?: UnifiedExportData })?.data || response.data || (response as unknown as UnifiedExportData);
    const result = convertUnifiedJsonToCsv(exportData, fallbackPatientName);

    return result;
  },

  /**
   * Export a clinical prescription summary
   * Endpoint: GET /api/v1/prescriptions/:prescriptionId/export
   */
  async exportPrescription(prescriptionId: string): Promise<PrescriptionExportData> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to export.');
    }

    const response = await apiClient.get<PrescriptionExportData>(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/export`
    );

    return (response.data as unknown as { data?: PrescriptionExportData })?.data || response.data;
  },

  /**
   * Download genuine prescription PDF
   * Endpoint: GET /api/v1/prescriptions/:prescriptionId/export?format=PDF
   */
  async downloadPrescriptionPdf(prescriptionId: string): Promise<ApiDownloadResult> {
    if (!prescriptionId) {
      throw new Error('Prescription ID is required to download PDF.');
    }
    const result = await apiClient.download(
      `/api/v1/prescriptions/${encodeURIComponent(prescriptionId)}/export?format=PDF`
    );
    const filename = result.filename || `prescription-${prescriptionId.substring(0, 8).toUpperCase()}.pdf`;
    triggerBrowserDownload(result.blob, filename);
    return { ...result, filename };
  },

  /**
   * Check medication interactions & allergy conflicts
   * Endpoint: POST /api/v1/prescriptions/check-interactions
   */
  async checkInteractions(payload: {
    patientProfileId?: string;
    medications: Array<{
      drugName: string;
      dosage?: string;
      frequency?: string;
      route?: string;
    }>;
  }): Promise<{
    hasConflict: boolean;
    severity: string;
    interactions: Array<{ drugA: string; drugB: string; severity: string; clinicalDescription: string; recommendation: string }>;
    allergyAlerts: Array<{ drugName: string; allergyMatched: string; severity: string; reaction: string }>;
    duplicateTherapyAlerts: Array<{ drugA: string; drugB: string; therapeuticClass: string; warning: string }>;
  }> {
    const res = await apiClient.post<any>('/api/v1/prescriptions/check-interactions', payload);
    return (res.data as any)?.data || res.data;
  },

  /**
   * Create an electronic prescription order with structured items
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/prescriptions
   */
  async createElectronicPrescription(
    patientProfileId: string,
    payload: {
      diagnosisCode?: string;
      notes?: string;
      status?: string;
      items: Array<{
        drugName: string;
        dosage: string;
        form: string;
        route?: string;
        frequency: string;
        durationDays: number;
        instructions?: string;
      }>;
    }
  ): Promise<any> {
    if (!patientProfileId) {
      throw new Error('Patient Profile ID is required to write a prescription.');
    }
    const res = await apiClient.post<any>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/prescriptions`,
      payload
    );
    return (res.data as any)?.data || res.data;
  },

  /**
   * Fetch authentic hospital admission records for an authorized patient
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/admissions
   */
  async getPatientAdmissions(patientProfileId: string): Promise<HospitalAdmission[]> {
    if (!patientProfileId) return [];

    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/admissions?page=1&limit=50`
      );

      const payload = response.data !== undefined ? response.data : response;
      return unwrapAdmissions(payload);
    } catch (err: unknown) {
      console.warn('[prescriptionService] Failed to load admissions:', err);
      throw err;
    }
  },

  /**
   * Record a hospital admission for an authorized patient
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/admissions
   */
  async createAdmission(
    patientProfileId: string,
    payload: CreateHospitalAdmissionPayload
  ): Promise<HospitalAdmission> {
    if (!patientProfileId) {
      throw new Error('Patient Profile ID is required to record admission.');
    }

    const response = await apiClient.post<HospitalAdmission>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/admissions`,
      payload
    );

    return (response.data as unknown as { data?: HospitalAdmission })?.data || response.data;
  },

  /**
   * Fetch chronological patient clinical records timeline
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline
   */
  async getPatientTimeline(patientProfileId: string): Promise<TimelineEvent[]> {
    if (!patientProfileId) return [];

    try {
      const response = await apiClient.get<TimelineEvent[]>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records/timeline?page=1&limit=50`
      );

      const items = Array.isArray(response.data)
        ? response.data
        : (response.data as unknown as { data?: TimelineEvent[] })?.data || [];

      return items;
    } catch {
      return [];
    }
  },

  /**
   * Fetch medical records for patient
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records
   */
  async getPatientMedicalRecords(patientProfileId: string): Promise<MedicalRecord[]> {
    if (!patientProfileId) return [];

    try {
      const response: ApiResponse<MedicalRecord[]> = await apiClient.get<MedicalRecord[]>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records?page=1&limit=50`
      );

      const items = Array.isArray(response.data)
        ? response.data
        : (response.data as unknown as { data?: MedicalRecord[] })?.data || [];

      return items;
    } catch {
      return [];
    }
  },
};

export default prescriptionService;
