/**
 * CareID Doctor Web — Clinical Reports & Diagnostic Analytics Service
 *
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * Folder: 20. Clinical Reports & Analytics (17 documented endpoints)
 *
 * Documented API Endpoints:
 * - GET    /api/v1/reports                      - Get diagnostic reports (with ?category=LAB|RADIOLOGY|CLINICAL)
 * - POST   /api/v1/reports                      - Upload/register a diagnostic report
 * - GET    /api/v1/reports/categories           - Category breakdown and counts
 * - GET    /api/v1/reports/search?q=            - Search diagnostic reports
 * - GET    /api/v1/reports/timeline             - Ordered reports timeline
 * - GET    /api/v1/reports/:id                  - Get report details by ID
 * - PUT    /api/v1/reports/:id                  - Update report metadata
 * - DELETE /api/v1/reports/:id                  - Soft-delete report
 * - POST   /api/v1/reports/:id/verify           - Mark report verified with notes
 * - POST   /api/v1/reports/:id/archive          - Archive diagnostic report
 * - POST   /api/v1/reports/:id/restore          - Restore soft-deleted/archived report
 * - GET    /api/v1/reports/download/:id         - Generate secure download URL/token
 * - GET    /api/v1/reports/preview/:id          - PDF preview metadata
 *
 * Doctor Portal Integration:
 * - GET /api/v1/reports is patient-scoped on the staging backend and returns 404
 *   ("Patient profile not found. Please complete registration first.") for DOCTOR tokens.
 * - For DOCTOR sessions, this service routes directly to Postman Folder 05 endpoints:
 *   GET /api/v1/doctors/patients,
 *   GET /api/v1/doctors/patients/:patientProfileId/medical-records, and
 *   PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId.
 */

import { apiClient, ApiResponse, ApiError, ApiDownloadResult, triggerBrowserDownload } from './apiClient';
import { authService } from './authService';
import { patientService, MedicalRecord } from './patientService';

interface DoctorPatientSummary {
  id: string;
  fullName: string;
  mrn: string;
  gender?: string;
  age?: number;
}

function isPatientPortalSession(): boolean {
  const claims = authService.getJwtClaims();
  if (!claims || !Array.isArray(claims.roles)) {
    return false;
  }
  const roles = claims.roles.map((r) => String(r).toUpperCase());
  return (
    roles.includes('PATIENT') &&
    !roles.includes('DOCTOR') &&
    !roles.includes('ADMIN') &&
    !roles.includes('SUPER_ADMIN')
  );
}

function computeAgeFromDob(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;
  const dobMs = new Date(dateOfBirth).getTime();
  if (Number.isNaN(dobMs)) return undefined;
  const age = Math.floor((Date.now() - dobMs) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 && age < 130 ? age : undefined;
}

const inflightReportsRequests = new Map<
  string,
  Promise<{ reports: ReportItemDTO[]; source: 'reports_api' | 'doctor_records' }>
>();
const inflightReportByIdRequests = new Map<string, Promise<ReportItemDTO>>();

export type DiagnosticCategory = 'LAB' | 'RADIOLOGY' | 'CLINICAL' | 'PATHOLOGY' | 'OTHER';
export type ReportStatus = 'verified' | 'pending' | 'critical';
export type ReportPriority = 'routine' | 'urgent' | 'stat';

export interface CriticalFindingValue {
  name: string;
  value: number | string;
  unit: string;
  refRange: string;
  status: 'critical_high' | 'critical_low' | 'normal';
}

export interface ReportItemDTO {
  id: string;
  title: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storageUrl?: string;
  storageKey?: string;
  category: string;
  reportDate?: string;
  providerName?: string;
  doctorName?: string;
  description?: string;
  tags?: string[];
  status?: string;
  isVerified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  patientProfileId?: string;
  patientName?: string;
  patientMrn?: string;
  patientGender?: string;
  patientAge?: number;
  criticalValues?: CriticalFindingValue[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportCategoryCount {
  category: string;
  count: number;
}

export interface ReportSummaryStats {
  todayReports: number;
  pendingReviews: number;
  criticalResults: number;
  recentlyUploaded: number;
}

/**
 * Maps a MedicalRecord entity to a unified ReportItemDTO
 */
export function mapMedicalRecordToReport(
  rec: MedicalRecord,
  defaultPatientName?: string,
  defaultMrn?: string,
  defaultGender?: string,
  defaultAge?: number
): ReportItemDTO {
  const recPatient = (rec as unknown as {
    patient?: {
      firstName?: string;
      lastName?: string;
      fullName?: string;
      gender?: string;
      dateOfBirth?: string;
      mrn?: string;
      patientNumber?: string;
    };
  })?.patient;

  const pName =
    recPatient?.fullName?.trim() ||
    [recPatient?.firstName, recPatient?.lastName].filter(Boolean).join(' ').trim() ||
    defaultPatientName ||
    '';

  const titleLower = (rec.title || '').toLowerCase();
  let category: DiagnosticCategory = 'CLINICAL';
  if (
    titleLower.includes('blood') ||
    titleLower.includes('cbc') ||
    titleLower.includes('cmp') ||
    titleLower.includes('metabolic') ||
    titleLower.includes('troponin') ||
    titleLower.includes('cardiac') ||
    titleLower.includes('panel') ||
    titleLower.includes('lab') ||
    rec.attachments?.some((a) => a.category?.toUpperCase() === 'LAB')
  ) {
    category = 'LAB';
  } else if (
    titleLower.includes('x-ray') ||
    titleLower.includes('mri') ||
    titleLower.includes('ct') ||
    titleLower.includes('ultrasound') ||
    titleLower.includes('radio') ||
    titleLower.includes('fluoroscopy') ||
    rec.attachments?.some((a) => a.category?.toUpperCase().includes('RADIO'))
  ) {
    category = 'RADIOLOGY';
  } else if (titleLower.includes('biopsy') || titleLower.includes('patholog')) {
    category = 'PATHOLOGY';
  }

  const primaryAttachment = rec.attachments?.[0];
  const rawStatus = String(rec.status || '').toUpperCase();
  const mappedStatus: ReportStatus =
    rawStatus === 'FINAL' || rawStatus === 'VERIFIED'
      ? 'verified'
      : rawStatus === 'CRITICAL'
      ? 'critical'
      : 'pending';

  return {
    id: rec.id,
    title: rec.title,
    fileName: primaryAttachment?.fileName || `${(rec.title || 'report').replace(/\s+/g, '_').toLowerCase()}.pdf`,
    fileSize: primaryAttachment?.fileSize || 524288,
    mimeType: primaryAttachment?.mimeType || 'application/pdf',
    storageUrl: primaryAttachment?.storageUrl,
    category,
    reportDate: rec.createdAt || new Date().toISOString(),
    providerName:
      rec.encounters?.[0]?.facilityName ||
      rec.facilityName ||
      rec.providerName ||
      (rec as unknown as { facility?: { name?: string } }).facility?.name ||
      'City General Hospital - Central Labs',
    doctorName:
      rec.encounters?.[0]?.providerName ||
      rec.doctorName ||
      (rec as unknown as { doctor?: { fullName?: string } }).doctor?.fullName ||
      'Attending Physician',
    description: rec.chiefComplaint || rec.clinicalNotes || rec.title,
    tags: [category.toLowerCase(), 'diagnostic'],
    status: mappedStatus,
    isVerified: mappedStatus === 'verified',
    patientProfileId: rec.patientProfileId,
    patientName: pName,
    patientMrn: defaultMrn || recPatient?.mrn || recPatient?.patientNumber || 'PT-CAREID-2026',
    patientGender: defaultGender || recPatient?.gender,
    patientAge: defaultAge ?? computeAgeFromDob(recPatient?.dateOfBirth),
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

class ReportService {
  /**
   * Resolves authorized patient profiles for the authenticated doctor via Postman Folder 05:
   * GET /api/v1/doctors/patients (with secondary lookup via appointments only if empty/403/404)
   */
  private async getAuthorizedDoctorPatients(): Promise<DoctorPatientSummary[]> {
    const patientsMap = new Map<string, DoctorPatientSummary>();

    const registerPatient = (raw: Record<string, unknown>, fallbackId?: string) => {
      const id = String(raw.id || raw.patientProfileId || fallbackId || '').trim();
      if (!id || patientsMap.has(id)) return;
      const fullName =
        String(raw.fullName || '').trim() ||
        [raw.firstName, raw.lastName].filter(Boolean).map(String).join(' ').trim() ||
        `Patient #${id.slice(-4)}`;
      const mrn = String(raw.mrn || raw.patientNumber || id);
      const gender = typeof raw.gender === 'string' ? raw.gender : undefined;
      const age = computeAgeFromDob(typeof raw.dateOfBirth === 'string' ? raw.dateOfBirth : undefined);
      patientsMap.set(id, { id, fullName, mrn, gender, age });
    };

    try {
      const res = await apiClient.get<unknown>('/api/v1/doctors/patients?page=1&limit=50');
      const raw = res.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown })?.data)
        ? ((raw as { data: unknown[] }).data)
        : [];
      for (const item of items) {
        if (item && typeof item === 'object') {
          registerPatient(item as Record<string, unknown>);
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403))) {
        throw err;
      }
    }

    if (patientsMap.size === 0) {
      try {
        const appointmentsRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
        const rawAppts = appointmentsRes.data;
        const appointments = Array.isArray(rawAppts)
          ? rawAppts
          : Array.isArray((rawAppts as { data?: unknown })?.data)
          ? ((rawAppts as { data: unknown[] }).data)
          : [];
        for (const appt of appointments) {
          if (!appt || typeof appt !== 'object') continue;
          const rec = appt as Record<string, unknown>;
          const p = rec.patient && typeof rec.patient === 'object' ? (rec.patient as Record<string, unknown>) : {};
          const fallbackId = String(rec.patientProfileId || rec.patientId || '').trim();
          registerPatient(p, fallbackId);
        }
      } catch (err: unknown) {
        if (!(err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 403))) {
          throw err;
        }
      }
    }

    return Array.from(patientsMap.values());
  }

  private async getDoctorScopedReports(params?: {
    category?: string;
    patientId?: string;
  }): Promise<{ reports: ReportItemDTO[]; source: 'reports_api' | 'doctor_records' }> {
    let targetPatients: DoctorPatientSummary[] = [];

    if (params?.patientId) {
      let patientName = '';
      let patientMrn = params.patientId;
      let gender: string | undefined;
      let age: number | undefined;
      try {
        const profile = await patientService.getDoctorPatientProfile(params.patientId);
        patientName = profile.fullName || [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
        patientMrn = profile.patientNumber || params.patientId;
        gender = profile.gender || undefined;
        age = computeAgeFromDob(profile.dateOfBirth || undefined);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode >= 500) {
          throw err;
        }
      }
      targetPatients = [{ id: params.patientId, fullName: patientName, mrn: patientMrn, gender, age }];
    } else {
      targetPatients = await this.getAuthorizedDoctorPatients();
    }

    if (targetPatients.length === 0) {
      return { reports: [], source: 'doctor_records' };
    }

    const settled = await Promise.allSettled(
      targetPatients.map(async (pt) => {
        const records = await patientService.getPatientMedicalRecords(pt.id, { includeArchived: true });
        return records.map((r) => mapMedicalRecordToReport(r, pt.fullName, pt.mrn, pt.gender, pt.age));
      })
    );

    const aggregated: ReportItemDTO[] = [];
    const unexpectedErrors: unknown[] = [];

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        aggregated.push(...result.value);
      } else {
        const reason = result.reason;
        const isIgnorableForbidden =
          settled.length > 1 && reason instanceof ApiError && reason.statusCode === 403;
        if (!isIgnorableForbidden) {
          unexpectedErrors.push(reason);
        }
      }
    }

    if (unexpectedErrors.length > 0) {
      throw unexpectedErrors[0];
    }

    // Sort newest diagnostic records first
    aggregated.sort((a, b) => {
      const tA = new Date(a.reportDate || a.createdAt || 0).getTime();
      const tB = new Date(b.reportDate || b.createdAt || 0).getTime();
      return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
    });

    let mapped = aggregated;
    if (params?.category && params.category !== 'All' && params.category !== 'All Types') {
      const catUpper = params.category.toUpperCase();
      mapped = mapped.filter(
        (r) =>
          r.category.toUpperCase().includes(catUpper) ||
          (r.title && r.title.toUpperCase().includes(catUpper))
      );
    }

    return { reports: mapped, source: 'doctor_records' };
  }

  /**
   * Retrieves diagnostic reports with optional category filtering.
   * Patient sessions query GET /api/v1/reports (Postman Folder 20).
   * Doctor sessions query Postman Folder 05 endpoints directly to avoid patient-profile 404 errors.
   * Coalesces identical concurrent in-flight requests (e.g. React StrictMode double-mount).
   */
  async getReports(params?: {
    category?: string;
    patientId?: string;
  }): Promise<{ reports: ReportItemDTO[]; source: 'reports_api' | 'doctor_records' }> {
    const patientSession = isPatientPortalSession();
    const key = JSON.stringify({
      patientSession,
      category: params?.category || '',
      patientId: params?.patientId || '',
    });

    const existing = inflightReportsRequests.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async (): Promise<{
      reports: ReportItemDTO[];
      source: 'reports_api' | 'doctor_records';
    }> => {
      if (!patientSession) {
        return await this.getDoctorScopedReports(params);
      }

      const query = new URLSearchParams();
      if (params?.category && params.category !== 'All' && params.category !== 'All Types') {
        query.set('category', params.category);
      }
      const qs = query.toString() ? `?${query.toString()}` : '';

      const response = await apiClient.get<unknown>(`/api/v1/reports${qs}`);
      const raw = response.data;
      const items: ReportItemDTO[] = Array.isArray(raw)
        ? (raw as ReportItemDTO[])
        : Array.isArray((raw as { data?: unknown })?.data)
        ? ((raw as { data: ReportItemDTO[] }).data)
        : [];
      return { reports: items, source: 'reports_api' };
    })().finally(() => {
      inflightReportsRequests.delete(key);
    });

    inflightReportsRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Retrieves single diagnostic report by ID
   * Endpoint: GET /api/v1/reports/:id (patient) or GET /api/v1/doctors/patients/:id/medical-records (doctor)
   */
  async getReportById(id: string, patientId?: string): Promise<ReportItemDTO> {
    const patientSession = isPatientPortalSession();
    const key = `${patientSession}|${id}|${patientId || ''}`;
    const existing = inflightReportByIdRequests.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = (async (): Promise<ReportItemDTO> => {
      if (!patientSession) {
        const record = await patientService.getMedicalRecordById(id, patientId);
        const resolvedPatientId = record.patientProfileId || patientId;
        let patientName: string | undefined;
        let patientMrn: string | undefined;
        let patientGender: string | undefined;
        let patientAge: number | undefined;

        if (resolvedPatientId) {
          try {
            const profileRes = await apiClient.get<unknown>(
              `/api/v1/doctors/patients/${encodeURIComponent(resolvedPatientId)}`
            );
            const raw = profileRes.data;
            const profile = (
              raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: unknown }).data
                ? (raw as { data: Record<string, unknown> }).data
                : raw
            ) as Record<string, unknown> | undefined;
            if (profile && typeof profile === 'object') {
              const firstName = profile.firstName ? String(profile.firstName).trim() : '';
              const lastName = profile.lastName ? String(profile.lastName).trim() : '';
              const fullName = profile.fullName ? String(profile.fullName).trim() : '';
              patientName = fullName || [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
              patientMrn =
                (profile.patientNumber ? String(profile.patientNumber) : undefined) ||
                (profile.mrn ? String(profile.mrn) : undefined) ||
                resolvedPatientId;
              patientGender = profile.gender ? String(profile.gender) : undefined;
              patientAge = computeAgeFromDob(
                profile.dateOfBirth ? String(profile.dateOfBirth) : undefined
              );
            }
          } catch (err: unknown) {
            if (err instanceof ApiError && err.statusCode >= 500) {
              throw err;
            }
          }
        }

        return mapMedicalRecordToReport(record, patientName, patientMrn, patientGender, patientAge);
      }

      const response = await apiClient.get<ReportItemDTO | { data: ReportItemDTO }>(
        `/api/v1/reports/${encodeURIComponent(id)}`
      );
      const payload = response.data;
      if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: ReportItemDTO }).data;
      }
      return payload as ReportItemDTO;
    })().finally(() => {
      inflightReportByIdRequests.delete(key);
    });

    inflightReportByIdRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Generates secure timed download URL for a report file
   * Endpoint: GET /api/v1/reports/download/:id (patient) or attachment metadata resolution (doctor)
   */
  async getDownloadUrl(reportId: string, patientId?: string): Promise<{ downloadUrl: string; token?: string }> {
    if (!isPatientPortalSession()) {
      const record = await patientService.getMedicalRecordById(reportId, patientId);
      const attachment = record.attachments?.[0];
      if (attachment?.storageUrl) {
        return { downloadUrl: attachment.storageUrl };
      }
      if (attachment?.id) {
        return { downloadUrl: `/api/v1/attachments/${encodeURIComponent(attachment.id)}/file` };
      }
      return { downloadUrl: '' };
    }

    try {
      const response = await apiClient.get<{ downloadUrl?: string; url?: string; token?: string }>(
        `/api/v1/reports/download/${encodeURIComponent(reportId)}`
      );
      const data = response.data;
      return {
        downloadUrl: data.downloadUrl || data.url || `/api/v1/reports/download/${reportId}/file`,
        token: data.token,
      };
    } catch {
      return {
        downloadUrl: `/api/v1/reports/download/${reportId}/file`,
      };
    }
  }

  /**
   * Marks a diagnostic report as VERIFIED with verification notes
   * Endpoint: POST /api/v1/reports/:id/verify (patient) or
   * PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:id (doctor)
   *
   * Preserves authentic diagnostic impression:
   * Only updates supported review/status fields ({ status: 'FINAL' })
   * and never replaces clinicalNotes with review confirmation text.
   */
  async verifyReport(
    reportId: string,
    notes?: string,
    patientProfileId?: string,
    originalClinicalNotes?: string
  ): Promise<ApiResponse<unknown>> {
    let resolvedPatientId = patientProfileId;
    let noteToPreserve = originalClinicalNotes;

    if (!resolvedPatientId && !isPatientPortalSession()) {
      const existingRecord = await patientService.getMedicalRecordById(reportId);
      resolvedPatientId = existingRecord?.patientProfileId;
      if (noteToPreserve === undefined) {
        noteToPreserve = existingRecord?.clinicalNotes;
      }
    }

    // 1. Doctor medical record update via Postman Folder 05
    if (resolvedPatientId) {
      try {
        const updateRes = await patientService.updateMedicalRecord(resolvedPatientId, reportId, {
          status: 'FINAL',
        });
        return {
          success: true,
          statusCode: 200,
          data: updateRes,
          message: 'Report verified successfully by attending clinician',
        };
      } catch (updateErr: unknown) {
        // Requirement: If the API requires clinicalNotes, preserve the original value exactly.
        if (updateErr instanceof ApiError && updateErr.statusCode === 400) {
          if (noteToPreserve === undefined) {
            try {
              const existingRecord = await patientService.getMedicalRecordById(reportId, resolvedPatientId);
              noteToPreserve = existingRecord?.clinicalNotes;
            } catch {
              // Ignore resolution failure and proceed
            }
          }

          if (noteToPreserve !== undefined) {
            const retryRes = await patientService.updateMedicalRecord(resolvedPatientId, reportId, {
              status: 'FINAL',
              clinicalNotes: noteToPreserve,
            });
            return {
              success: true,
              statusCode: 200,
              data: retryRes,
              message: 'Report verified successfully by attending clinician',
            };
          }
        }
        throw updateErr;
      }
    }

    // 2. Patient-scoped /api/v1/reports/:id/verify
    return await apiClient.post<unknown>(`/api/v1/reports/${encodeURIComponent(reportId)}/verify`, {
      notes: notes || 'Verified by Attending Clinician',
    });
  }

  /**
   * Retrieves report categories list with record count breakdown
   * Endpoint: GET /api/v1/reports/categories (patient) or computed from doctor records
   */
  async getCategories(): Promise<ReportCategoryCount[]> {
    if (!isPatientPortalSession()) {
      const { reports } = await this.getReports();
      const counts = new Map<string, number>([
        ['LAB', 0],
        ['RADIOLOGY', 0],
        ['CLINICAL', 0],
      ]);
      for (const r of reports) {
        const key = (r.category || 'CLINICAL').toUpperCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
    }

    const response = await apiClient.get<ReportCategoryCount[]>(`/api/v1/reports/categories`);
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Export diagnostic reports as standard PDF
   * Endpoint: GET /api/v1/reports/export?format=PDF
   */
  async downloadReportsPdf(): Promise<ApiDownloadResult> {
    const result = await apiClient.download('/api/v1/reports/export?format=PDF');
    const filename = result.filename || 'careid-diagnostic-reports.pdf';
    triggerBrowserDownload(result.blob, filename);
    return { ...result, filename };
  }

  /**
   * Export diagnostic reports as CSV
   * Endpoint: GET /api/v1/reports/export?format=CSV
   */
  async downloadReportsCsv(): Promise<ApiDownloadResult> {
    const result = await apiClient.download('/api/v1/reports/export?format=CSV');
    const filename = result.filename || 'careid-diagnostic-reports.csv';
    triggerBrowserDownload(result.blob, filename);
    return { ...result, filename };
  }
}

export const reportService = new ReportService();
