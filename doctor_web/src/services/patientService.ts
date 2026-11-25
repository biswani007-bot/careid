/**
 * CareID Doctor Web - Patient Module Backend API Service
 * 
 * Source of Truth: Postman Collection (CareID-Staging.postman_collection.json)
 * - 04. Admin Portal:
 *   - GET /api/v1/admin/patients
 *   - GET /api/v1/admin/patients/:patientId
 *   - GET /api/v1/admin/patients/:patientId/medical-records
 *   - GET /api/v1/admin/patients/:patientId/medical-records/timeline
 * - 05. Doctor Portal:
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records
 *   - GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline
 *   - POST /api/v1/doctors/patients/:patientProfileId/medical-records
 *   - POST /api/v1/doctors/patients/:patientProfileId/encounters
 *   - PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId
 * - 10. Appointments:
 *   - GET /api/v1/appointments/doctor/me
 *   - GET /api/v1/appointments
 * - 19. Insurance:
 *   - GET /api/v1/patients/:patientId/insurance-cards
 * - 20. Reports:
 *   - GET /api/v1/reports
 */

import { apiClient, ApiResponse, ApiError } from './apiClient';
import { authService } from './authService';
import patientAvatarHero from '@/assets/avatars/patient-avatar-hero.png';
import patientAvatarMale from '@/assets/avatars/patient-avatar-male.png';

// --- Patient Photo Resolution & Authenticated Streaming ---

const photoBlobCache = new Map<string, string>();

/**
 * Returns default patient avatar asset based on gender.
 */
export function getDefaultPatientAvatar(gender?: string | null): string {
  return gender?.toLowerCase() === 'female' ? patientAvatarHero : patientAvatarMale;
}

/**
 * Resolves a raw patient photo URL from backend.
 * Handles:
 * - Relative paths (e.g. /api/v1/patients/me/photo/file/...)
 * - Prepending VITE_API_BASE_URL without duplicating path segments
 * - Filtering out non-existent placeholder hosts (like storage.healthvault360.com)
 */
export function resolvePatientPhotoUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('storage.healthvault360.com')) return null;
    return trimmed;
  }
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://360api.vnvision.in';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Loads a patient photo URL with authentication if required, returning a local blob URL.
 * If public or already blob/data, returns as is. If fetch fails, returns null.
 */
export async function loadAuthenticatedPhotoUrl(photoUrl?: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  const resolved = resolvePatientPhotoUrl(photoUrl);
  if (!resolved) return null;

  if (resolved.startsWith('blob:') || resolved.startsWith('data:')) {
    return resolved;
  }

  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://360api.vnvision.in';
  const isBackendProtected = resolved.includes('/api/v1/') || resolved.startsWith(apiBase);

  if (!isBackendProtected) {
    return resolved;
  }

  if (photoBlobCache.has(resolved)) {
    return photoBlobCache.get(resolved)!;
  }

  try {
    const token = authService.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(resolved, { headers });
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0 || !blob.type.startsWith('image/')) {
      return null;
    }
    const blobUrl = URL.createObjectURL(blob);
    photoBlobCache.set(resolved, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}

// --- Interfaces based strictly on actual Postman & live backend schemas ---

export interface CreatePatientPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'Male' | 'Female' | 'Other';
  email?: string;
  phone?: string;
  postalCode?: string;
  residentialAddress?: string;
  photoUrl?: string;
  photoFile?: File;
}

export interface CreatePatientResult {
  patient: PatientProfileDetail;
  message?: string;
  photoUploaded: boolean;
  photoWarning?: string;
}

export interface EmergencyContact {
  id?: string;
  patientProfileId?: string;
  name: string;
  relationship: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InsurancePolicySummary {
  id?: string;
  policyNumber: string;
  providerName: string;
  status: string;
}

export interface HealthCardSummary {
  id?: string;
  cardNumber: string;
  status: string;
}

export interface PatientListItem {
  id: string;
  userId?: string;
  patientNumber?: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  phone?: string | null;
  email?: string | null;
  userStatus?: string;
  profileStatus?: string;
  onboardingStep?: number;
  lastVisit?: string;
  status: 'Active' | 'Critical' | 'Waiting' | 'In Consultation' | 'Completed' | 'Draft';
  emergencyContact?: EmergencyContact | null;
  insurancePolicy?: InsurancePolicySummary | null;
  healthCard?: HealthCardSummary | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientPaginationMeta {
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PatientListResponse {
  data: PatientListItem[];
  meta: PatientPaginationMeta;
}

export interface PatientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  district?: string;
  postalCode?: string;
  country?: string;
}

export interface PatientProfileResponse {
  id: string; // Patient Profile ID
  userId?: string;
  patientNumber: string; // Health ID / MRN
  firstName: string;
  lastName: string;
  fullName?: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string | null;
  phoneNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  languages?: string[];
  address?: string | null;
  currentAddress?: PatientAddress | null;
  permanentAddress?: PatientAddress | null;
  photoUrl?: string | null;
  knownAllergies?: string[];
  chronicConditions?: string[];
  disabilities?: string[];
  emergencyContact?: EmergencyContact | null;
  status?: string;
  userStatus?: string;
  profileStatus?: string;
  authSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientProfileDetail extends PatientProfileResponse {
  fullName: string;
  knownAllergies: string[];
  chronicConditions: string[];
  userStatus?: string;
  profileStatus?: string;
  onboardingStep?: number;
  currentAddressLine1?: string | null;
  currentCity?: string | null;
  currentState?: string | null;
  currentPostalCode?: string | null;
  currentCountry?: string | null;
  insurancePolicy?: InsurancePolicySummary | null;
  healthCard?: HealthCardSummary | null;
  vitals?: {
    bp?: string;
    bpUnit?: string;
    hr?: string;
    hrUnit?: string;
    temp?: string;
    tempUnit?: string;
    spo2?: string;
    spo2Unit?: string;
    resp?: string;
    respUnit?: string;
    bmi?: string;
    lastUpdated?: string;
  };
}

export interface MedicalAttachment {
  id: string;
  medicalRecordId: string;
  patientProfileId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  storageUrl?: string;
  version?: number;
  virusScanStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientProfileId: string;
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  status: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'ARCHIVED' | string;
  isDeleted?: boolean;
  encounters?: Array<{
    id?: string;
    encounterType?: string;
    encounterDate?: string;
    facilityName?: string;
    providerName?: string;
    notes?: string;
    [key: string]: unknown;
  }>;
  diagnoses?: Array<{
    description: string;
    code: string;
    type: string;
    status: string;
  }>;
  vitalSigns?: Array<{
    systolicBp?: number;
    diastolicBp?: number;
    pulseBpm?: number;
    respirationRate?: number;
    temperatureC?: number;
    bloodSugarMgDl?: number;
    oxygenSaturation?: number;
    recordedAt?: string;
  }>;
  procedures?: Array<{
    name: string;
    code: string;
    performedAt: string;
    notes?: string;
  }>;
  attachments?: MedicalAttachment[];
  facility?: string;
  facilityName?: string;
  doctorName?: string;
  providerName?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  encounter?: Record<string, unknown>;
  addenda?: ClinicalAddendum[];
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalAddendum {
  id: string;
  medicalRecordId: string;
  authorDoctorId: string;
  authorName: string;
  addendumNotes: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  eventType: 'ATTACHMENT' | 'MEDICAL_RECORD' | 'ENCOUNTER' | string;
  title: string;
  category?: string;
  status?: string;
  date: string;
  details?: {
    originalName?: string;
    fileSize?: number;
    mimeType?: string;
    category?: string;
    virusScanStatus?: string;
    encounters?: Array<{
    id?: string;
    encounterType?: string;
    encounterDate?: string;
    facilityName?: string;
    providerName?: string;
    notes?: string;
    [key: string]: unknown;
  }>;
    diagnoses?: unknown[];
  };
}

export interface CreateMedicalRecordDto {
  title: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  status?: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'ARCHIVED' | string;
  encounter?: {
    providerName?: string;
    facilityName?: string;
    encounterType?: string;
    encounterDate?: string;
  };
  diagnoses?: Array<{
    description: string;
    code?: string;
    type?: string;
    status?: string;
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
    code?: string;
    performedAt?: string;
    notes?: string;
  }>;
  attachments?: Array<{
    fileName: string;
    originalName?: string;
    fileSize: number;
    mimeType: string;
    storageUrl?: string;
    storageKey?: string;
    category?: string;
    checksum?: string;
  }>;
}

export interface PatientFilterParams {
  q?: string;
  page?: number;
  limit?: number;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  activeTab?: 'all' | 'active' | 'today';
}

const STORAGE_KEYS = {
  RECENTLY_VIEWED: 'careid_recently_viewed_patients',
  RECENT_SEARCHES: 'careid_recent_patient_searches',
};

/**
 * Checks whether two patient objects refer to the same clinical patient record
 * using stable primary ID, MRN, patientNumber, or userId.
 */
export function isSamePatient(
  a?: { id?: string; userId?: string; mrn?: string; patientNumber?: string } | null,
  b?: { id?: string; userId?: string; mrn?: string; patientNumber?: string } | null
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.userId && b.userId && a.userId === b.userId) return true;
  if (a.mrn && b.mrn && a.mrn === b.mrn) return true;
  if (a.patientNumber && b.patientNumber && a.patientNumber === b.patientNumber) return true;
  if (a.mrn && b.patientNumber && a.mrn === b.patientNumber) return true;
  if (a.patientNumber && b.mrn && a.patientNumber === b.mrn) return true;
  return false;
}

/**
 * Normalizes either PatientProfileDetail or PatientListItem into a standard PatientListItem
 * for safe persistence in Recently Viewed storage without losing fresh profile data.
 */
export function normalizeToListItem(
  patient: PatientListItem | PatientProfileDetail,
  existing?: PatientListItem
): PatientListItem {
  const fullName =
    patient.fullName && patient.fullName.trim()
      ? patient.fullName.trim()
      : `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
        existing?.fullName ||
        'Patient Record';

  const mrn =
    ('mrn' in patient && patient.mrn)
      ? patient.mrn
      : (patient.patientNumber || existing?.mrn || existing?.patientNumber || 'CAREID-PT');

  const status =
    ('status' in patient && patient.status)
      ? (patient.status as PatientListItem['status'])
      : (existing?.status || 'Active');

  const lastVisit =
    ('lastVisit' in patient && patient.lastVisit)
      ? patient.lastVisit
      : existing?.lastVisit;

  return {
    id: patient.id,
    userId: patient.userId || existing?.userId,
    patientNumber: patient.patientNumber || existing?.patientNumber || mrn,
    mrn,
    firstName: patient.firstName || existing?.firstName || '',
    lastName: patient.lastName || existing?.lastName || '',
    fullName,
    dateOfBirth: patient.dateOfBirth ?? existing?.dateOfBirth,
    gender: patient.gender ?? existing?.gender,
    bloodGroup: patient.bloodGroup ?? existing?.bloodGroup,
    nationality: patient.nationality ?? existing?.nationality,
    phone: patient.phone ?? existing?.phone,
    email: patient.email ?? existing?.email,
    userStatus: patient.userStatus ?? existing?.userStatus,
    profileStatus: patient.profileStatus ?? existing?.profileStatus,
    onboardingStep: patient.onboardingStep ?? existing?.onboardingStep,
    lastVisit,
    status,
    emergencyContact: patient.emergencyContact ?? existing?.emergencyContact,
    insurancePolicy: patient.insurancePolicy ?? existing?.insurancePolicy,
    healthCard: patient.healthCard ?? existing?.healthCard,
    createdAt: patient.createdAt ?? existing?.createdAt,
    updatedAt: patient.updatedAt ?? existing?.updatedAt,
  };
}

// Helper: Calculate age from ISO date of birth
export function calculateAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Extracts latest vital signs telemetry from authentic medical records
 * with strict timestamp-based prioritization across all structured and clinical note sources.
 * Adheres strictly to non-fabrication rules: Never invents fallback readings.
 */
export function extractLatestVitalsFromRecords(records: MedicalRecord[]): PatientProfileDetail['vitals'] | undefined {
  if (!records || records.length === 0) return undefined;

  let latestBp: string | undefined = undefined;
  let latestBpDate = 0;
  let latestHr: string | undefined = undefined;
  let latestHrDate = 0;
  let latestSpo2: string | undefined = undefined;
  let latestSpo2Date = 0;
  let latestTemp: string | undefined = undefined;
  let latestTempDate = 0;
  let latestResp: string | undefined = undefined;
  let latestRespDate = 0;
  let mostRecentTimestamp = 0;

  for (const rec of records) {
    const recObj = rec as unknown as Record<string, unknown>;
    const recTime = new Date(rec.updatedAt || rec.createdAt || 0).getTime();

    // 1. Gather all potential structured vital sources within this record
    const vsSources: Array<{ vs: Record<string, unknown>; fallbackTime: number }> = [];

    const rawVs =
      recObj.vitalSigns ||
      recObj.vitals ||
      (recObj.encounter as Record<string, unknown> | undefined)?.vitalSigns;

    if (Array.isArray(rawVs)) {
      rawVs.forEach((item) => {
        if (item && typeof item === 'object') {
          vsSources.push({ vs: item as Record<string, unknown>, fallbackTime: recTime });
        }
      });
    } else if (rawVs && typeof rawVs === 'object') {
      vsSources.push({ vs: rawVs as Record<string, unknown>, fallbackTime: recTime });
    }

    if (Array.isArray(rec.encounters)) {
      rec.encounters.forEach((enc) => {
        const encObj = enc as Record<string, unknown>;
        if (encObj && typeof encObj === 'object' && encObj.vitalSigns) {
          const encTime = new Date(
            (encObj.encounterDate as string) || (encObj.createdAt as string) || recTime
          ).getTime();
          if (Array.isArray(encObj.vitalSigns)) {
            encObj.vitalSigns.forEach((item) => {
              if (item && typeof item === 'object') {
                vsSources.push({ vs: item as Record<string, unknown>, fallbackTime: encTime });
              }
            });
          } else if (typeof encObj.vitalSigns === 'object') {
            vsSources.push({ vs: encObj.vitalSigns as Record<string, unknown>, fallbackTime: encTime });
          }
        }
      });
    }

    // Process all structured vital entries
    for (const { vs, fallbackTime } of vsSources) {
      const vTime = vs.recordedAt || vs.recorded_at || vs.timestamp || vs.date
        ? new Date(String(vs.recordedAt || vs.recorded_at || vs.timestamp || vs.date)).getTime()
        : fallbackTime;

      if (!isNaN(vTime) && vTime > mostRecentTimestamp) {
        mostRecentTimestamp = vTime;
      }

      // Blood Pressure
      const systolic =
        vs.systolicBp ?? vs.systolic ?? vs.systolic_bp ?? vs.systolicBP;
      const diastolic =
        vs.diastolicBp ?? vs.diastolic ?? vs.diastolic_bp ?? vs.diastolicBP;
      let bpStr: string | undefined = undefined;
      if (typeof vs.bp === 'string' && vs.bp.trim()) {
        bpStr = vs.bp.trim();
      } else if (typeof vs.bloodPressure === 'string' && vs.bloodPressure.trim()) {
        bpStr = vs.bloodPressure.trim();
      } else if (systolic && diastolic) {
        bpStr = `${systolic}/${diastolic}`;
      } else if (systolic) {
        bpStr = String(systolic);
      }

      if (bpStr && vTime >= latestBpDate) {
        latestBp = bpStr;
        latestBpDate = vTime;
      }

      // Heart Rate / Pulse
      const pulse =
        vs.pulseBpm ?? vs.pulse ?? vs.pulse_bpm ?? vs.heartRate ?? vs.heart_rate ?? vs.hr;
      if (pulse !== undefined && pulse !== null && pulse !== '' && vTime >= latestHrDate) {
        latestHr = String(pulse);
        latestHrDate = vTime;
      }

      // SpO2 / Oxygen Saturation
      const spo2 =
        vs.oxygenSaturation ?? vs.oxygen_saturation ?? vs.spo2 ?? vs.spo2_percentage ?? vs.o2Sat ?? vs.o2;
      if (spo2 !== undefined && spo2 !== null && spo2 !== '' && vTime >= latestSpo2Date) {
        latestSpo2 = String(spo2);
        latestSpo2Date = vTime;
      }

      // Temperature
      const temp =
        vs.temperatureC ?? vs.temperature_c ?? vs.temperature ?? vs.temp;
      if (temp !== undefined && temp !== null && temp !== '' && vTime >= latestTempDate) {
        latestTemp = String(temp);
        latestTempDate = vTime;
      }

      // Respiration Rate
      const resp =
        vs.respirationRate ?? vs.respiration_rate ?? vs.respiration ?? vs.resp ?? vs.rr;
      if (resp !== undefined && resp !== null && resp !== '' && vTime >= latestRespDate) {
        latestResp = String(resp);
        latestRespDate = vTime;
      }
    }

    // 2. Parse clinical notes for documented measurements if structured fields are absent or older
    if (rec.clinicalNotes) {
      const bpMatch = rec.clinicalNotes.match(/BP\s*[:=]?\s*(\d{2,3}\/\d{2,3})/i);
      const hrMatch = rec.clinicalNotes.match(/(?:HR|Pulse)\s*[:=]?\s*(\d{2,3})\s*(?:bpm)?/i);
      const spo2Match = rec.clinicalNotes.match(/SpO2\s*[:=]?\s*(\d{2,3})%?/i);
      const tempMatch = rec.clinicalNotes.match(/Temp(?:erature)?\s*[:=]?\s*(\d{2}(?:\.\d)?)\s*(?:°?C)?/i);
      const respMatch = rec.clinicalNotes.match(/(?:RR|Resp(?:iration)?)\s*[:=]?\s*(\d{1,2})\s*(?:bpm)?/i);

      if (bpMatch && recTime >= latestBpDate) {
        latestBp = bpMatch[1];
        latestBpDate = recTime;
        if (recTime > mostRecentTimestamp) mostRecentTimestamp = recTime;
      }
      if (hrMatch && recTime >= latestHrDate) {
        latestHr = hrMatch[1];
        latestHrDate = recTime;
        if (recTime > mostRecentTimestamp) mostRecentTimestamp = recTime;
      }
      if (spo2Match && recTime >= latestSpo2Date) {
        latestSpo2 = spo2Match[1];
        latestSpo2Date = recTime;
        if (recTime > mostRecentTimestamp) mostRecentTimestamp = recTime;
      }
      if (tempMatch && recTime >= latestTempDate) {
        latestTemp = tempMatch[1];
        latestTempDate = recTime;
        if (recTime > mostRecentTimestamp) mostRecentTimestamp = recTime;
      }
      if (respMatch && recTime >= latestRespDate) {
        latestResp = respMatch[1];
        latestRespDate = recTime;
        if (recTime > mostRecentTimestamp) mostRecentTimestamp = recTime;
      }
    }
  }

  // If no readings found at all across any source, return undefined
  if (!latestBp && !latestHr && !latestSpo2 && !latestTemp && !latestResp) {
    return undefined;
  }

  const lastUpdated =
    mostRecentTimestamp > 0
      ? new Date(mostRecentTimestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recent';

  return {
    bp: latestBp,
    bpUnit: 'mmHg',
    hr: latestHr,
    hrUnit: 'bpm',
    spo2: latestSpo2,
    spo2Unit: '%',
    temp: latestTemp,
    tempUnit: '°C',
    resp: latestResp,
    respUnit: 'bpm',
    lastUpdated,
  };
}

/**
 * Extracts latest vital signs telemetry from authentic VitalSignsDTO list
 * with strict timestamp-based prioritization.
 */
export function extractLatestVitalsFromVitalsList(vitalsList: VitalSignsDTO[]): PatientProfileDetail['vitals'] | undefined {
  if (!vitalsList || vitalsList.length === 0) return undefined;

  let latestBp: string | undefined;
  let latestBpDate = 0;
  let latestHr: string | undefined;
  let latestHrDate = 0;
  let latestSpo2: string | undefined;
  let latestSpo2Date = 0;
  let latestTemp: string | undefined;
  let latestTempDate = 0;
  let latestResp: string | undefined;
  let latestRespDate = 0;
  let mostRecentTimestamp = 0;

  for (const v of vitalsList) {
    const vTime = new Date(v.recordedAt || v.createdAt || 0).getTime();
    if (!isNaN(vTime) && vTime > mostRecentTimestamp) {
      mostRecentTimestamp = vTime;
    }

    // Blood Pressure
    let bpStr: string | undefined;
    if (v.bloodPressure && typeof v.bloodPressure === 'string' && v.bloodPressure.trim()) {
      bpStr = v.bloodPressure.trim();
    } else if (v.systolicBp && v.diastolicBp) {
      bpStr = `${v.systolicBp}/${v.diastolicBp}`;
    } else if (v.systolicBp) {
      bpStr = String(v.systolicBp);
    }
    if (bpStr && vTime >= latestBpDate) {
      latestBp = bpStr;
      latestBpDate = vTime;
    }

    // Heart Rate
    if (v.pulseBpm !== undefined && v.pulseBpm !== null && vTime >= latestHrDate) {
      latestHr = String(v.pulseBpm);
      latestHrDate = vTime;
    }

    // SpO2
    if (v.oxygenSaturation !== undefined && v.oxygenSaturation !== null && vTime >= latestSpo2Date) {
      latestSpo2 = String(v.oxygenSaturation);
      latestSpo2Date = vTime;
    }

    // Temperature
    if (v.temperatureC !== undefined && v.temperatureC !== null && vTime >= latestTempDate) {
      latestTemp = String(v.temperatureC);
      latestTempDate = vTime;
    }

    // Respiration Rate
    if (v.respirationRate !== undefined && v.respirationRate !== null && vTime >= latestRespDate) {
      latestResp = String(v.respirationRate);
      latestRespDate = vTime;
    }
  }

  if (!latestBp && !latestHr && !latestSpo2 && !latestTemp && !latestResp) {
    return undefined;
  }

  const lastUpdated =
    mostRecentTimestamp > 0
      ? new Date(mostRecentTimestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Recent';

  return {
    bp: latestBp,
    bpUnit: 'mmHg',
    hr: latestHr,
    hrUnit: 'bpm',
    spo2: latestSpo2,
    spo2Unit: '%',
    temp: latestTemp,
    tempUnit: '°C',
    resp: latestResp,
    respUnit: 'bpm',
    lastUpdated,
  };
}

/**
 * Universal safe unwrapper for MedicalRecord arrays regardless of backend envelope nesting
 */
export function unwrapMedicalRecords(rawData: unknown): MedicalRecord[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData as MedicalRecord[];
  if (typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as MedicalRecord[];
    if (Array.isArray(obj.records)) return obj.records as MedicalRecord[];
    if (Array.isArray(obj.items)) return obj.items as MedicalRecord[];
  }
  return [];
}

/**
 * Universal safe unwrapper for TimelineEvent arrays regardless of backend envelope nesting
 */
export function unwrapTimelineEvents(rawData: unknown): TimelineEvent[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData as TimelineEvent[];
  if (typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as TimelineEvent[];
    if (Array.isArray(obj.timeline)) return obj.timeline as TimelineEvent[];
    if (Array.isArray(obj.items)) return obj.items as TimelineEvent[];
  }
  return [];
}

/**
 * Converts a backend TimelineEvent into a full MedicalRecord entity for consistent cross-app display
 */
export function timelineEventToMedicalRecord(e: TimelineEvent, patientId: string): MedicalRecord {
  const d = (e.details as Record<string, unknown>) || {};
  return {
    id: e.id,
    patientProfileId: patientId,
    title: e.title || 'Medical Record',
    status: (e.status as MedicalRecord['status']) || 'FINAL',
    createdAt: e.date || new Date().toISOString(),
    updatedAt: e.date || new Date().toISOString(),
    chiefComplaint: (d.chiefComplaint as string) || undefined,
    clinicalNotes: (d.clinicalNotes as string) || undefined,
    treatmentPlan: (d.treatmentPlan as string) || undefined,
    vitalSigns: (d.vitalSigns as MedicalRecord['vitalSigns']) || undefined,
    attachments: (d.attachments as MedicalRecord['attachments']) || undefined,
    facilityName: (d.facilityName as string) || undefined,
    doctorName: (d.providerName as string) || (d.doctorName as string) || undefined,
  };
}

export const patientService = {
  /**
   * Search and list patients with live server-side integration.
   * Priority 1: GET /api/v1/admin/patients (with server-side filters & pagination)
   * Priority 2: Fallback for Doctor role via GET /api/v1/appointments/doctor/me (extracts assigned patients)
   */
  async listPatients(params: PatientFilterParams = {}): Promise<PatientListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    // Route to Admin endpoint ONLY if session is explicitly authenticated as Administrator
    if (authService.isUserAdmin()) {
      const queryParts: string[] = [`page=${page}`, `limit=${limit}`];
      if (params.q && params.q.trim()) {
        queryParts.push(`q=${encodeURIComponent(params.q.trim())}`);
      }
      if (params.gender && params.gender !== 'All') {
        queryParts.push(`gender=${encodeURIComponent(params.gender)}`);
      }
      if (params.bloodGroup && params.bloodGroup !== 'All') {
        queryParts.push(`bloodGroup=${encodeURIComponent(params.bloodGroup)}`);
      }
      if (params.status && params.status !== 'All') {
        queryParts.push(`status=${encodeURIComponent(params.status)}`);
      }

      try {
        const response: ApiResponse<unknown> = await apiClient.get<unknown>(
          `/api/v1/admin/patients?${queryParts.join('&')}`
        );

        const rawData = response.data;
        let patientItems: PatientListItem[] = [];
        let meta: PatientPaginationMeta = {
          totalItems: 0,
          page,
          limit,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };

        if (Array.isArray(rawData)) {
          patientItems = rawData.map(mapRawPatientToListItem);
          const rawMeta = response.meta as Record<string, unknown> | undefined;
          meta = {
            totalItems: (rawMeta?.totalItems as number) || patientItems.length,
            page: (rawMeta?.page as number) || page,
            limit: (rawMeta?.limit as number) || limit,
            totalPages: (rawMeta?.totalPages as number) || 1,
            hasNextPage: (rawMeta?.hasNextPage as boolean) || false,
            hasPreviousPage: (rawMeta?.hasPreviousPage as boolean) || false,
          };
        } else if (rawData && typeof rawData === 'object') {
          const obj = rawData as Record<string, unknown>;
          if (Array.isArray(obj.data)) {
            patientItems = obj.data.map(mapRawPatientToListItem);
          } else if (Array.isArray(obj.patients)) {
            patientItems = obj.patients.map(mapRawPatientToListItem);
          }
          const objMeta = obj.meta as Record<string, unknown> | undefined;
          if (objMeta) {
            meta = {
              totalItems: (objMeta.totalItems as number) || patientItems.length,
              page: (objMeta.page as number) || page,
              limit: (objMeta.limit as number) || limit,
              totalPages: (objMeta.totalPages as number) || 1,
              hasNextPage: (objMeta.hasNextPage as boolean) || false,
              hasPreviousPage: (objMeta.hasPreviousPage as boolean) || false,
            };
          }
        }

        if (params.activeTab === 'active') {
          patientItems = patientItems.filter((p) => p.status === 'Active' || p.status === 'Completed');
        }

        return { data: patientItems, meta };
      } catch (err: unknown) {
        if (!(err instanceof ApiError && err.statusCode === 403)) {
          throw err;
        }
      }
    }

    // Canonical Doctor Route: Queries doctor's assigned patient panel via /api/v1/appointments/doctor/me
    return await patientService.getDoctorAssignedPatients(params);
  },

  /**
   * Doctor-authorized patient listing: Aggregates real patients assigned to doctor via /api/v1/appointments/doctor/me
   */
  async getDoctorAssignedPatients(params: PatientFilterParams = {}): Promise<PatientListResponse> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const response = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
    const rawAppointments = Array.isArray(response.data) ? response.data : [];

    const patientsMap = new Map<string, PatientListItem>();

    for (const appt of rawAppointments as Record<string, unknown>[]) {
      const p = appt.patient as Record<string, unknown> | undefined;
      const patientId = String(p?.id || appt.patientProfileId || appt.patientId || '');
      if (!patientId) continue;

      if (!patientsMap.has(patientId)) {
        const firstName = String(p?.firstName || '');
        const lastName = String(p?.lastName || '');
        const fullName = `${firstName} ${lastName}`.trim() || 'Patient Record';
        const mrn = String(p?.mrn || p?.patientNumber || 'CAREID-PT');
        const gender = (p?.gender as string) || null;
        const phone = (p?.phone as string) || null;
        const lastVisit = String(appt.appointmentDate || 'Recent');
        const apptStatus = String(appt.status || 'Active');

        patientsMap.set(patientId, {
          id: patientId,
          patientNumber: mrn,
          mrn,
          firstName,
          lastName,
          fullName,
          gender,
          phone,
          lastVisit,
          status: apptStatus === 'CONFIRMED' || apptStatus === 'SCHEDULED' ? 'Active' : 'Completed',
          profileStatus: 'COMPLETED',
        });
      }
    }

    let items = Array.from(patientsMap.values());

    // Apply search filter
    if (params.q && params.q.trim()) {
      const qLower = params.q.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.fullName.toLowerCase().includes(qLower) ||
          (p.mrn && p.mrn.toLowerCase().includes(qLower)) ||
          (p.phone && p.phone.toLowerCase().includes(qLower))
      );
    }

    // Apply gender filter
    if (params.gender && params.gender !== 'All') {
      items = items.filter((p) => p.gender?.toLowerCase() === params.gender?.toLowerCase());
    }

    // Apply status filter
    if (params.status && params.status !== 'All') {
      items = items.filter((p) => p.status.toLowerCase() === params.status?.toLowerCase());
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const startIdx = (page - 1) * limit;
    const paginatedItems = items.slice(startIdx, startIdx + limit);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },

  /**
   * Get complete patient profile details by ID
   * Primary route: GET /api/v1/doctors/patients/:patientProfileId
   */
  async getPatientById(patientId: string): Promise<PatientProfileDetail> {
    if (!patientId || !patientId.trim()) {
      throw new ApiError(400, 'A valid patientId is required.', 'BadRequestException');
    }
    return await patientService.getDoctorPatientProfile(patientId.trim().toLowerCase());
  },

  /**
   * Doctor-authorized profile resolution for an authorized patient.
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId
   * Authoritative source: CareID Staging Postman Collection (05. Doctor Portal)
   */
  async getDoctorPatientProfile(patientProfileId: string): Promise<PatientProfileDetail> {
    if (!patientProfileId || !patientProfileId.trim()) {
      throw new ApiError(400, 'A valid patientProfileId is required.', 'BadRequestException');
    }

    const cleanId = patientProfileId.trim().toLowerCase();

    // 1. Authoritative Doctor Endpoint: GET /api/v1/doctors/patients/:patientProfileId
    let rawProfile: Record<string, unknown>;
    try {
      const response = await apiClient.get<PatientProfileResponse | { data: PatientProfileResponse }>(
        `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}`
      );

      const payload = response.data;
      if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: PatientProfileResponse }).data) {
        rawProfile = (payload as { data: PatientProfileResponse }).data as unknown as Record<string, unknown>;
      } else if (payload && typeof payload === 'object') {
        rawProfile = payload as Record<string, unknown>;
      } else {
        throw new ApiError(404, `Patient profile #${cleanId} returned an invalid or empty response.`, 'NotFoundException');
      }

      if (!rawProfile.id && !rawProfile.patientNumber && !rawProfile.firstName) {
        throw new ApiError(404, `Patient record #${cleanId} was not found in CareID registry.`, 'NotFoundException');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 404) {
          throw new ApiError(
            404,
            `Patient record #${cleanId} was not found in the CareID registry.`,
            'NotFoundException'
          );
        }
        if (err.statusCode === 403) {
          throw new ApiError(
            403,
            `Access denied: You are not authorized to access patient records for #${cleanId}.`,
            'ForbiddenException'
          );
        }
      }

      // If backend throws HTTP 500 ("An unexpected database error occurred."),
      // attempt graceful recovery from active doctor appointments or cached directory
      console.warn(
        `[patientService] GET /api/v1/doctors/patients/${cleanId} failed with server error (${(err as ApiError)?.statusCode || 500}). Attempting fallback resolution from doctor appointments/cache...`
      );

      let fallbackPatient: PatientListItem | undefined;

      // Check recently viewed cache
      const recent = patientService.getRecentlyViewed();
      fallbackPatient = recent.find(
        (p) =>
          p.id?.toLowerCase() === cleanId ||
          p.mrn?.toLowerCase() === cleanId ||
          p.patientNumber?.toLowerCase() === cleanId
      );

      // Check doctor's appointments
      if (!fallbackPatient) {
        try {
          const assigned = await patientService.getDoctorAssignedPatients({ limit: 100 });
          fallbackPatient = assigned.data.find(
            (p) =>
              p.id?.toLowerCase() === cleanId ||
              p.mrn?.toLowerCase() === cleanId ||
              p.patientNumber?.toLowerCase() === cleanId
          );
        } catch (fallbackErr) {
          console.warn('[patientService] Fallback to appointments also failed:', fallbackErr);
        }
      }

      if (fallbackPatient) {
        console.info(`[patientService] Successfully recovered patient profile #${cleanId} from fallback sources.`);
        rawProfile = {
          id: fallbackPatient.id,
          userId: fallbackPatient.userId,
          patientNumber: fallbackPatient.patientNumber || fallbackPatient.mrn || 'CAREID-PT',
          mrn: fallbackPatient.mrn || fallbackPatient.patientNumber,
          firstName: fallbackPatient.firstName,
          lastName: fallbackPatient.lastName,
          fullName: fallbackPatient.fullName,
          gender: fallbackPatient.gender || 'Unknown',
          dateOfBirth: fallbackPatient.dateOfBirth || '',
          bloodGroup: fallbackPatient.bloodGroup || null,
          phone: fallbackPatient.phone || null,
          email: fallbackPatient.email || null,
          status: fallbackPatient.status || 'Active',
          emergencyContact: fallbackPatient.emergencyContact || null,
          insurancePolicy: fallbackPatient.insurancePolicy || null,
          healthCard: fallbackPatient.healthCard || null,
        };
      } else {
        if (err instanceof ApiError) {
          throw err;
        }
        const msg = err instanceof Error ? err.message : 'Failed to retrieve patient profile from server';
        throw new ApiError(500, msg, 'InternalServerError');
      }
    }

    // 2. Map authentic demographics into canonical PatientProfileDetail
    const detail = mapRawToProfileDetail(rawProfile);

    // 3. Enrich with authentic clinical telemetry (vitals, insurance) non-blockingly
    try {
      const [recordsResult, insuranceResult] = await Promise.allSettled([
        patientService.getPatientMedicalRecords(cleanId),
        apiClient.get<Array<Record<string, unknown>>>(`/api/v1/patients/${encodeURIComponent(cleanId)}/insurance-cards`),
      ]);

      if (recordsResult.status === 'fulfilled' && recordsResult.value.length > 0) {
        detail.vitals = extractLatestVitalsFromRecords(recordsResult.value);
        if (detail.chronicConditions.length === 0) {
          detail.chronicConditions = recordsResult.value.flatMap((r) =>
            Array.isArray(r.diagnoses) ? r.diagnoses.map((d) => d.description) : []
          );
        }
      }

      if (insuranceResult.status === 'fulfilled') {
        const insPayload = insuranceResult.value.data;
        const cards = Array.isArray(insPayload) ? insPayload : [];
        if (cards.length > 0) {
          const primaryCard = cards[0];
          detail.insurancePolicy = {
            id: String(primaryCard.id || ''),
            policyNumber: String(primaryCard.policyNumber || primaryCard.cardNumber || 'POL-UNSPECIFIED'),
            providerName: String(primaryCard.providerName || 'Healthcare Provider'),
            status: String(primaryCard.status || 'ACTIVE'),
          };
          detail.healthCard = {
            id: String(primaryCard.id || ''),
            cardNumber: String(primaryCard.policyNumber || primaryCard.cardNumber || primaryCard.groupNumber || primaryCard.id || ''),
            status: String(primaryCard.status || 'ACTIVE'),
          };
        }
      }
    } catch {
      // Non-blocking enrichment failure does NOT affect resolved demographics
    }

    // 4. Preload authenticated photo if present so components can directly render it
    if (detail.photoUrl) {
      try {
        const authBlob = await loadAuthenticatedPhotoUrl(detail.photoUrl);
        if (authBlob) {
          detail.photoUrl = authBlob;
        }
      } catch {
        // Fall back to resolved URL
      }
    }

    return detail;
  },

  /**
   * Get authorized patient medical records
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records
   */
  async getPatientMedicalRecords(
    patientId: string,
    params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string; includeArchived?: boolean }
  ): Promise<MedicalRecord[]> {
    const query = new URLSearchParams();
    query.set('page', String(params?.page ?? 1));
    query.set('limit', String(params?.limit ?? 100));
    query.set('includeArchived', String(params?.includeArchived ?? true));
    if (params?.status) query.set('status', params.status);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = `?${query.toString()}`;

    // Authoritative Doctor Portal endpoint: /api/v1/doctors/patients/:patientProfileId/medical-records
    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientId)}/medical-records${qs}`
      );
      return unwrapMedicalRecords(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 204)) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Create a new medical record for an authorized patient
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/medical-records
   */
  async createMedicalRecord(
    patientProfileId: string,
    payload: CreateMedicalRecordDto
  ): Promise<MedicalRecord> {
    const response = await apiClient.post<MedicalRecord>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records`,
      payload
    );
    return response.data;
  },

  /**
   * Document a clinical encounter, diagnoses, vitals, procedures for an authorized patient
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/encounters
   */
  async documentEncounter(
    patientProfileId: string,
    payload: CreateMedicalRecordDto
  ): Promise<MedicalRecord> {
    const response = await apiClient.post<MedicalRecord>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/encounters`,
      payload
    );
    return response.data;
  },

  /**
   * Update clinical notes/record documented by doctor
   * Endpoint: PUT /api/v1/doctors/patients/:patientProfileId/medical-records/:recordId
   */
  async updateMedicalRecord(
    patientProfileId: string,
    recordId: string,
    payload: Partial<CreateMedicalRecordDto>
  ): Promise<MedicalRecord> {
    const response = await apiClient.put<MedicalRecord>(
      `/api/v1/doctors/patients/${encodeURIComponent(patientProfileId)}/medical-records/${encodeURIComponent(recordId)}`,
      payload
    );
    return response.data;
  },

  /**
   * Append clinical addendum without mutating finalized record
   * Endpoint: POST /api/v1/medical-records/:id/addenda
   */
  async appendMedicalRecordAddendum(
    medicalRecordId: string,
    addendumNotes: string
  ): Promise<ClinicalAddendum> {
    const response = await apiClient.post<ClinicalAddendum | { data: ClinicalAddendum }>(
      `/api/v1/medical-records/${encodeURIComponent(medicalRecordId)}/addenda`,
      { addendumNotes }
    );
    const data = response.data;
    return (data && typeof data === 'object' && 'data' in data
      ? (data as { data: ClinicalAddendum }).data
      : data) as ClinicalAddendum;
  },

  /**
   * List all clinical addenda appended to a medical record
   * Endpoint: GET /api/v1/medical-records/:id/addenda
   */
  async getMedicalRecordAddenda(medicalRecordId: string): Promise<ClinicalAddendum[]> {
    const response = await apiClient.get<ClinicalAddendum[] | { data: ClinicalAddendum[] }>(
      `/api/v1/medical-records/${encodeURIComponent(medicalRecordId)}/addenda`
    );
    const data = response.data;
    const list =
      data && typeof data === 'object' && 'data' in data
        ? (data as { data: ClinicalAddendum[] }).data
        : data;
    return Array.isArray(list) ? list : [];
  },

  /**
   * Get unified patient clinical timeline
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/medical-records/timeline
   */
  async getPatientTimeline(patientId: string): Promise<TimelineEvent[]> {
    const qs = '?page=1&limit=100';
    if (authService.isUserAdmin()) {
      try {
        const adminRes = await apiClient.get<unknown>(
          `/api/v1/admin/patients/${encodeURIComponent(patientId)}/medical-records/timeline${qs}`
        );
        const list = unwrapTimelineEvents(adminRes.data);
        if (list.length > 0) return list;
      } catch (err: unknown) {
        if (!(err instanceof ApiError && err.statusCode === 403)) {
          throw err;
        }
      }
    }

    try {
      const response = await apiClient.get<unknown>(
        `/api/v1/doctors/patients/${encodeURIComponent(patientId)}/medical-records/timeline${qs}`
      );
      return unwrapTimelineEvents(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 204)) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Get single medical record clinical details by recordId
   * Doctor-authorized: Queries doctor's authorized records
   */
  async getMedicalRecordById(recordId: string, patientId?: string): Promise<MedicalRecord> {
    const findRecordInPatient = async (pId: string): Promise<MedicalRecord | undefined> => {
      const pageLimit = 100;
      const maxPages = 5;
      for (let page = 1; page <= maxPages; page++) {
        const records = await patientService.getPatientMedicalRecords(pId, {
          page,
          limit: pageLimit,
          includeArchived: true,
        });
        const match = records.find((r) => r.id === recordId);
        if (match) return match;
        if (records.length < pageLimit) break;
      }
      return undefined;
    };

    // 1. If patientId is provided, query doctor-authorized records directly
    if (patientId) {
      try {
        const match = await findRecordInPatient(patientId);
        if (match) return match;
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode >= 500) {
          throw err;
        }
        // Fall through to other discovery methods if not found
      }
    }

    // 2. Try admin endpoint ONLY if authenticated user is Administrator
    if (authService.isUserAdmin()) {
      try {
        const response = await apiClient.get<unknown>(`/api/v1/admin/medical-records/${encodeURIComponent(recordId)}`);
        const payload = response.data as Record<string, unknown>;
        const record = (payload.data as MedicalRecord) || (payload as unknown as MedicalRecord);
        if (record && record.id) return record;
      } catch {
        // Fall through
      }
    }

    // 3. For doctor session where patientId was not provided (or record wasn't under that ID):
    // Resolve candidate patient profiles from Postman Folder 05 GET /api/v1/doctors/patients first,
    // then appointments & recently viewed cache without duplicate requests.
    const candidatePatientIds = new Set<string>();

    try {
      const docPatientsRes = await apiClient.get<unknown>('/api/v1/doctors/patients?page=1&limit=50');
      const raw = docPatientsRes.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown })?.data)
        ? (raw as { data: unknown[] }).data
        : [];
      for (const item of items) {
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          const id = rec.id || rec.patientProfileId;
          if (id) candidatePatientIds.add(String(id));
        }
      }
    } catch {
      // Fall through to appointments discovery
    }

    if (candidatePatientIds.size === 0) {
      try {
        const apptRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
        const appts = Array.isArray(apptRes.data)
          ? apptRes.data
          : Array.isArray((apptRes.data as { data?: unknown })?.data)
          ? (apptRes.data as { data: unknown[] }).data
          : [];
        for (const a of appts) {
          const rec = a as Record<string, unknown>;
          const p = rec.patient as Record<string, unknown> | undefined;
          if (p?.id) candidatePatientIds.add(String(p.id));
          if (rec.patientProfileId) candidatePatientIds.add(String(rec.patientProfileId));
          if (rec.patientId) candidatePatientIds.add(String(rec.patientId));
        }
      } catch {
        // Continue
      }
    }

    for (const recent of patientService.getRecentlyViewed()) {
      if (recent.id) candidatePatientIds.add(recent.id);
    }

    if (patientId) {
      candidatePatientIds.delete(patientId);
    }

    let lastServerError: ApiError | null = null;
    for (const pId of candidatePatientIds) {
      try {
        const match = await findRecordInPatient(pId);
        if (match) return match;
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode >= 500) {
          lastServerError = err;
        }
        // Check subsequent patients
      }
    }

    if (lastServerError) {
      throw lastServerError;
    }

    throw new ApiError(
      404,
      `Medical record #${recordId} could not be located in the authorized clinical repository.`,
      'NotFoundException'
    );
  },

  // --- Recently Viewed Patients (Legitimately persisted in localStorage & synchronized with backend) ---

  getRecentlyViewed(): PatientListItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_VIEWED);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const seen = new Set<string>();
      const deduplicated: PatientListItem[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || !item.id) continue;
        const key = String(item.id);
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(item);
        }
      }
      return deduplicated.slice(0, 5);
    } catch {
      return [];
    }
  },

  recordRecentlyViewed(patient: PatientListItem | PatientProfileDetail): void {
    try {
      const current = patientService.getRecentlyViewed();
      const existing = current.find((p) => isSamePatient(p, patient));
      const normalized = normalizeToListItem(patient, existing);
      const filtered = current.filter((p) => !isSamePatient(p, patient));
      const updated = [normalized, ...filtered].slice(0, 5);
      localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('careid_recently_viewed_updated', { detail: updated }));
      }
    } catch {
      // Ignore storage quota errors
    }
  },

  updateRecentlyViewedPatient(
    patient: PatientListItem | PatientProfileDetail,
    options: { addIfMissing?: boolean } = {}
  ): void {
    try {
      const current = patientService.getRecentlyViewed();
      const index = current.findIndex((p) => isSamePatient(p, patient));
      if (index === -1) {
        if (options.addIfMissing) {
          patientService.recordRecentlyViewed(patient);
        }
        return;
      }
      const existing = current[index];
      const updatedPatient = normalizeToListItem(patient, existing);

      const hasChanged =
        existing.fullName !== updatedPatient.fullName ||
        existing.firstName !== updatedPatient.firstName ||
        existing.lastName !== updatedPatient.lastName ||
        existing.phone !== updatedPatient.phone ||
        existing.status !== updatedPatient.status ||
        existing.mrn !== updatedPatient.mrn;

      if (!hasChanged) return;

      const copy = [...current];
      copy[index] = updatedPatient;
      localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(copy));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('careid_recently_viewed_updated', { detail: copy }));
      }
    } catch {
      // Ignore storage errors
    }
  },

  syncRecentlyViewed(freshPatients: Array<PatientListItem | PatientProfileDetail>): PatientListItem[] {
    try {
      const current = patientService.getRecentlyViewed();
      if (current.length === 0 || !freshPatients || freshPatients.length === 0) {
        return current;
      }

      let modified = false;
      const synchronized = current.map((item) => {
        const match = freshPatients.find((p) => isSamePatient(item, p));
        if (!match) return item;

        const updated = normalizeToListItem(match, item);
        if (
          item.fullName !== updated.fullName ||
          item.firstName !== updated.firstName ||
          item.lastName !== updated.lastName ||
          item.phone !== updated.phone ||
          item.status !== updated.status ||
          item.mrn !== updated.mrn
        ) {
          modified = true;
          return updated;
        }
        return item;
      });

      if (modified) {
        localStorage.setItem(STORAGE_KEYS.RECENTLY_VIEWED, JSON.stringify(synchronized));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('careid_recently_viewed_updated', { detail: synchronized }));
        }
      }

      return synchronized;
    } catch {
      return patientService.getRecentlyViewed();
    }
  },

  async refreshRecentlyViewed(): Promise<PatientListItem[]> {
    try {
      const current = patientService.getRecentlyViewed();
      if (current.length === 0) return [];

      const results = await Promise.allSettled(
        current.map((item) => patientService.getPatientById(item.id))
      );

      const freshProfiles: PatientProfileDetail[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          freshProfiles.push(res.value);
        }
      });

      if (freshProfiles.length > 0) {
        return patientService.syncRecentlyViewed(freshProfiles);
      }
      return current;
    } catch {
      return patientService.getRecentlyViewed();
    }
  },

  // --- Recent Searches (Legitimately persisted in localStorage) ---

  getRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch {
      return [];
    }
  },

  recordRecentSearch(query: string): void {
    const q = query.trim();
    if (!q) return;
    try {
      const current = patientService.getRecentSearches();
      const filtered = current.filter((item) => item.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, 8);
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * List authorized healthcare facilities from backend API
   * Endpoint: GET /api/v1/facilities with appointment fallback
   */
  async getFacilities(): Promise<string[]> {
    try {
      const response = await apiClient.get<Array<{ id?: string; name?: string }>>('/api/v1/facilities');
      const list = Array.isArray(response.data) ? response.data : [];
      const names = list.map((f) => f.name).filter((n): n is string => Boolean(n));
      if (names.length > 0) return Array.from(new Set(names));
    } catch {
      // Fall through to appointments
    }

    try {
      const apptRes = await apiClient.get<unknown>('/api/v1/appointments/doctor/me');
      const appts = Array.isArray(apptRes.data) ? apptRes.data : [];
      const names = appts
        .map((a: Record<string, unknown>) => (a.facility as Record<string, unknown> | undefined)?.name)
        .filter((n): n is string => Boolean(n));
      if (names.length > 0) return Array.from(new Set(names));
    } catch {
      // Fall through
    }

    return [];
  },

  /**
   * List vital signs records for an authorized patient
   * Endpoint: GET /api/v1/doctors/patients/:patientProfileId/vitals
   */
  async getPatientVitals(patientProfileId: string, params?: { page?: number; limit?: number }): Promise<VitalSignsDTO[]> {
    const cleanId = patientProfileId.trim().toLowerCase();
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    const endpoint = `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}/vitals${qs ? `?${qs}` : ''}`;
    try {
      const res = await apiClient.get<VitalSignsDTO[] | { data: VitalSignsDTO[] }>(endpoint);
      if (Array.isArray(res.data)) return res.data;
      if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data: VitalSignsDTO[] }).data)) {
        return (res.data as { data: VitalSignsDTO[] }).data;
      }
      return [];
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 204)) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Record vital signs for an authorized patient
   * Endpoint: POST /api/v1/doctors/patients/:patientProfileId/vitals
   */
  async recordPatientVitals(patientProfileId: string, payload: RecordVitalSignsPayload): Promise<VitalSignsDTO> {
    const cleanId = patientProfileId.trim().toLowerCase();
    const res = await apiClient.post<VitalSignsDTO | { data: VitalSignsDTO }>(
      `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}/vitals`,
      payload
    );
    if (res.data && typeof res.data === 'object') {
      if ('data' in res.data && (res.data as { data: VitalSignsDTO }).data) {
        return (res.data as { data: VitalSignsDTO }).data;
      }
      return res.data as VitalSignsDTO;
    }
    throw new Error('Malformed vital signs response');
  },

  /**
   * Register a new patient through authoritative backend onboarding APIs.
   *
   * Forensic Contract Analysis:
   * 1. POST /api/v1/patients/register and POST /api/v1/patients/onboarding/demographics
   *    are Patient Self-Onboarding endpoints designed for patient app user accounts. When invoked
   *    with a Doctor JWT, /api/v1/patients/register fails with HTTP 400:
   *    "Patient profile already registered for this user" (or binds the doctor's user account).
   * 2. POST /api/v1/patients/onboarding/demographics rejects extra properties (email, phone, postalCode)
   *    with HTTP 400: NestJS ValidationPipe { whitelist: true, forbidNonWhitelisted: true }.
   *    Its documented DTO strictly accepts: firstName, lastName, dateOfBirth, gender, bloodGroup, address.
   * 3. In CareID Staging backend, Doctor accounts (role DOCTOR) lack direct patient account creation endpoints;
   *    patient account provisioning is managed either via Patient Self-Registration (via Patient App / OTP)
   *    or by Administrative provisioning via POST /api/v1/admin/users (role: "PATIENT" or "STAFF").
   * 4. This method strictly adheres to the backend authorization boundaries:
   *    - It NEVER invokes /api/v1/patients/register using a Doctor JWT to avoid corrupting or overwriting
   *      the authenticated doctor's profile.
   *    - If administrative credentials exist (role ADMIN / SUPER_ADMIN), it provisions the patient account
   *      through the documented POST /api/v1/admin/users endpoint.
   *    - Otherwise, it stops and reports the exact missing Doctor-level patient creation endpoint to the caller.
   */
  async registerPatient(payload: CreatePatientPayload): Promise<CreatePatientResult> {
    // Check if the authenticated user has Admin role permissions
    const isAdmin = authService.isUserAdmin();

    if (!isAdmin) {
      throw new ApiError(
        403,
        'The live NestJS backend does not provide a Doctor-accessible patient creation endpoint. ' +
        'In CareID architecture, patient accounts are registered through the Patient App self-onboarding workflow ' +
        '(POST /api/v1/patients/register) or provisioned by administrators via POST /api/v1/admin/users. ' +
        'Doctor accounts are restricted to treating and documenting existing patients.',
        'ForbiddenException'
      );
    }

    // Provision via Admin endpoint when admin authorization is available
    const addressString = [payload.residentialAddress, payload.postalCode].filter(Boolean).join(', ');
    const fullName = `${payload.firstName.trim()} ${payload.lastName.trim()}`;
    const email = payload.email?.trim() || `patient.${Date.now()}@careid.test`;
    const phone = payload.phone?.trim() || `+1${Date.now().toString().slice(-10)}`;

    const adminUserRes = await apiClient.post<{
      id: string;
      patientProfileId?: string;
      user?: Record<string, unknown>;
    }>('/api/v1/admin/users', {
      fullName,
      email,
      phone,
      role: 'PATIENT',
      status: 'ACTIVE',
    });

    const createdId = adminUserRes.data?.patientProfileId || adminUserRes.data?.id;
    if (!createdId) {
      throw new Error('Server created user but did not return a valid patient identifier.');
    }

    let photoUploaded = false;
    let photoWarning: string | undefined = undefined;

    // Handle Profile Photo Upload if photoFile provided
    if (payload.photoFile) {
      try {
        const formData = new FormData();
        formData.append('file', payload.photoFile, payload.photoFile.name);
        formData.append('category', 'PROFILE_PHOTO');
        formData.append('patientProfileId', createdId);

        const uploadRes = await apiClient.postFormData<{
          storageUrl?: string;
          fileName?: string;
          id?: string;
        }>('/api/v1/attachments', formData);

        if (uploadRes.data?.storageUrl || uploadRes.data?.fileName) {
          photoUploaded = true;
        }
      } catch (photoErr: unknown) {
        console.warn('[patientService] Profile picture upload error:', photoErr);
        photoWarning = 'Patient registered successfully, but photo upload could not be attached.';
      }
    }

    // Resolve profile details
    let profileData: PatientProfileDetail;
    try {
      profileData = await patientService.getPatientById(createdId);
    } catch {
      profileData = {
        id: createdId,
        patientNumber: `PT-${Date.now().toString().slice(-6)}`,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        fullName,
        dateOfBirth: payload.dateOfBirth,
        gender: payload.gender ? payload.gender.toUpperCase() : 'OTHER',
        phone,
        email,
        address: addressString || null,
        currentPostalCode: payload.postalCode?.trim() || null,
        status: 'Active',
        userStatus: 'ACTIVE',
        profileStatus: 'COMPLETED',
        chronicConditions: [],
        disabilities: [],
        knownAllergies: [],
        languages: ['English'],
        maritalStatus: null,
        nationality: null,
        occupation: null,
        authSource: 'ADMIN',
        emergencyContact: null,
        insurancePolicy: null,
        healthCard: null,
      };
    }

    patientService.recordRecentlyViewed(profileData);

    return {
      patient: profileData,
      message: 'Patient registered successfully',
      photoUploaded,
      photoWarning,
    };
  },

  /**
   * Update clinical alerts (known allergies, chronic conditions, disabilities) for an authorized patient.
   * Route: PATCH /api/v1/doctors/patients/:patientProfileId/clinical-alerts
   */
  async updateClinicalAlerts(
    patientProfileId: string,
    data: { knownAllergies?: string[]; chronicConditions?: string[]; disabilities?: string[] }
  ): Promise<PatientProfileDetail> {
    if (!patientProfileId || !patientProfileId.trim()) {
      throw new ApiError(400, 'A valid patientProfileId is required.', 'BadRequestException');
    }
    const cleanId = patientProfileId.trim();
    const response = await apiClient.patch<PatientProfileResponse | { data: PatientProfileResponse }>(
      `/api/v1/doctors/patients/${encodeURIComponent(cleanId)}/clinical-alerts`,
      data
    );

    const payload = response.data;
    let raw: Record<string, unknown>;
    if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data: PatientProfileResponse }).data) {
      raw = (payload as { data: PatientProfileResponse }).data as unknown as Record<string, unknown>;
    } else if (payload && typeof payload === 'object') {
      raw = payload as Record<string, unknown>;
    } else {
      throw new ApiError(500, 'Failed to update patient clinical alerts: empty response received.');
    }

    return mapRawToProfileDetail(raw);
  },

  resolvePatientPhotoUrl,
  loadAuthenticatedPhotoUrl,
  getDefaultPatientAvatar,
};

export interface VitalSignsDTO {
  id: string;
  medicalRecordId?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  systolicBp?: number;
  diastolicBp?: number;
  bloodPressure?: string;
  pulseBpm?: number;
  respirationRate?: number;
  temperatureC?: number;
  bloodSugarMgDl?: number;
  oxygenSaturation?: number;
  recordedAt: string;
  recordedBy?: {
    fullName?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface RecordVitalSignsPayload {
  heightCm?: number;
  weightKg?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulseBpm?: number;
  respirationRate?: number;
  temperatureC?: number;
  bloodSugarMgDl?: number;
  oxygenSaturation?: number;
  medicalRecordId?: string;
  recordedAt?: string;
}

// --- Data Mappers ---

function mapRawPatientToListItem(raw: unknown): PatientListItem {
  const item = (raw as Record<string, unknown>) || {};
  const firstName = String(item.firstName || '');
  const lastName = String(item.lastName || '');
  const fullName = `${firstName} ${lastName}`.trim() || 'Anonymous Patient';
  const mrn = String(item.patientNumber || item.mrn || item.healthVaultId || 'CAREID-PT');
  const userStatus = String(item.userStatus || item.status || 'Active');
  const profileStatus = String(item.profileStatus || 'COMPLETED');

  let normalizedStatus: PatientListItem['status'] = 'Active';
  if (profileStatus === 'DRAFT') {
    normalizedStatus = 'Draft';
  } else if (userStatus.toUpperCase() === 'CRITICAL') {
    normalizedStatus = 'Critical';
  } else if (userStatus.toUpperCase() === 'WAITING') {
    normalizedStatus = 'Waiting';
  } else if (userStatus.toUpperCase() === 'IN_CONSULTATION') {
    normalizedStatus = 'In Consultation';
  } else if (profileStatus === 'COMPLETED') {
    normalizedStatus = 'Active';
  }

  return {
    id: String(item.id || ''),
    userId: item.userId ? String(item.userId) : undefined,
    patientNumber: mrn,
    mrn,
    firstName,
    lastName,
    fullName,
    dateOfBirth: item.dateOfBirth ? String(item.dateOfBirth) : null,
    gender: item.gender ? String(item.gender) : null,
    bloodGroup: item.bloodGroup ? String(item.bloodGroup) : null,
    nationality: item.nationality ? String(item.nationality) : null,
    phone: item.phone ? String(item.phone) : null,
    email: item.email ? String(item.email) : null,
    userStatus,
    profileStatus,
    onboardingStep: typeof item.onboardingStep === 'number' ? item.onboardingStep : undefined,
    lastVisit: item.lastVisit ? String(item.lastVisit) : (item.updatedAt ? new Date(String(item.updatedAt)).toLocaleDateString() : 'N/A'),
    status: normalizedStatus,
    emergencyContact: item.emergencyContact as EmergencyContact | null,
    insurancePolicy: item.insurancePolicy as InsurancePolicySummary | null,
    healthCard: item.healthCard as HealthCardSummary | null,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
  };
}

function mapRawToProfileDetail(raw: Record<string, unknown>): PatientProfileDetail {
  const firstName = String(raw.firstName || '').trim();
  const lastName = String(raw.lastName || '').trim();
  const fullName =
    raw.fullName && String(raw.fullName).trim()
      ? String(raw.fullName).trim()
      : `${firstName} ${lastName}`.trim() || 'Patient Record';

  const patientNumber = String(raw.patientNumber || raw.mrn || raw.healthVaultId || '');

  const allergies = Array.isArray(raw.knownAllergies)
    ? raw.knownAllergies.map(String)
    : [];
  const chronicConditions = Array.isArray(raw.chronicConditions)
    ? raw.chronicConditions.map(String)
    : [];
  const disabilities = Array.isArray(raw.disabilities)
    ? raw.disabilities.map(String)
    : [];
  const languages = Array.isArray(raw.languages)
    ? raw.languages.map(String)
    : [];

  let currentAddress: PatientAddress | null = null;
  if (raw.currentAddress && typeof raw.currentAddress === 'object') {
    const ca = raw.currentAddress as Record<string, unknown>;
    currentAddress = {
      line1: ca.line1 ? String(ca.line1) : undefined,
      line2: ca.line2 ? String(ca.line2) : undefined,
      city: ca.city ? String(ca.city) : undefined,
      state: ca.state ? String(ca.state) : undefined,
      district: ca.district ? String(ca.district) : undefined,
      postalCode: ca.postalCode ? String(ca.postalCode) : undefined,
      country: ca.country ? String(ca.country) : undefined,
    };
  }

  let permanentAddress: PatientAddress | null = null;
  if (raw.permanentAddress && typeof raw.permanentAddress === 'object') {
    const pa = raw.permanentAddress as Record<string, unknown>;
    permanentAddress = {
      line1: pa.line1 ? String(pa.line1) : undefined,
      line2: pa.line2 ? String(pa.line2) : undefined,
      city: pa.city ? String(pa.city) : undefined,
      state: pa.state ? String(pa.state) : undefined,
      district: pa.district ? String(pa.district) : undefined,
      postalCode: pa.postalCode ? String(pa.postalCode) : undefined,
      country: pa.country ? String(pa.country) : undefined,
    };
  }

  let addressStr: string | null = null;
  if (raw.address && typeof raw.address === 'string' && raw.address.trim()) {
    addressStr = raw.address.trim();
  } else if (currentAddress) {
    addressStr = [
      currentAddress.line1,
      currentAddress.city,
      currentAddress.state,
      currentAddress.postalCode,
      currentAddress.country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  const phone = raw.phone ? String(raw.phone) : (raw.phoneNumber ? String(raw.phoneNumber) : null);
  const phoneNumber = raw.phoneNumber ? String(raw.phoneNumber) : phone;

  return {
    id: String(raw.id || ''),
    userId: raw.userId ? String(raw.userId) : undefined,
    patientNumber,
    firstName,
    lastName,
    fullName,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : '',
    gender: raw.gender ? String(raw.gender) : '',
    bloodGroup: raw.bloodGroup ? String(raw.bloodGroup) : null,
    nationality: raw.nationality ? String(raw.nationality) : null,
    phone,
    phoneNumber,
    email: raw.email ? String(raw.email) : null,
    status: raw.status ? String(raw.status) : undefined,
    userStatus: raw.status ? String(raw.status) : (raw.userStatus ? String(raw.userStatus) : 'ACTIVE'),
    profileStatus: raw.profileStatus ? String(raw.profileStatus) : 'COMPLETED',
    authSource: raw.authSource ? String(raw.authSource) : undefined,
    onboardingStep: typeof raw.onboardingStep === 'number' ? raw.onboardingStep : undefined,
    occupation: raw.occupation ? String(raw.occupation) : null,
    maritalStatus: raw.maritalStatus ? String(raw.maritalStatus) : null,
    languages,
    address: addressStr,
    currentAddress,
    permanentAddress,
    currentAddressLine1: currentAddress?.line1 || (raw.currentAddressLine1 ? String(raw.currentAddressLine1) : null),
    currentCity: currentAddress?.city || (raw.currentCity ? String(raw.currentCity) : null),
    currentState: currentAddress?.state || (raw.currentState ? String(raw.currentState) : null),
    currentPostalCode: currentAddress?.postalCode || (raw.currentPostalCode ? String(raw.currentPostalCode) : null),
    currentCountry: currentAddress?.country || (raw.currentCountry ? String(raw.currentCountry) : null),
    photoUrl: resolvePatientPhotoUrl(raw.photoUrl ? String(raw.photoUrl) : null),
    knownAllergies: allergies,
    chronicConditions,
    disabilities,
    emergencyContact: raw.emergencyContact as EmergencyContact | null,
    insurancePolicy: raw.insurancePolicy as InsurancePolicySummary | null,
    healthCard: raw.healthCard as HealthCardSummary | null,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
