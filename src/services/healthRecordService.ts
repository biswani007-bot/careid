import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

export type HealthRecordCategory = 'Medical' | 'Dental' | 'Vision';
export type HealthRecordStatus = 'Verified' | 'Pending Verification' | 'Rejected';

export interface PatientNestedInfo {
  name?: string;
  fullName?: string;
  id?: string;
}

export interface HealthRecordItem {
  id: string;
  recordNumber: string;
  title: string;
  patientName?: string;
  patient?: PatientNestedInfo | string;
  patientInitials?: string;
  patientAvatarBg?: string;
  patientId: string;
  isDependent?: boolean;
  category: HealthRecordCategory;
  recordType: string;
  provider: string;
  facility: string;
  recordDate: string;
  recordDateIso?: string;
  status: HealthRecordStatus;
  summary: string;
  clinicalNotes?: string;
  documentType?: string;
  fileSize?: string;
  ocrConfidence?: number;
}

export interface AuditTrailEvent {
  id: string;
  recordId: string;
  action: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
  timestampRelative?: string;
  status: 'verified' | 'success' | 'info' | 'warning';
  ipAddress?: string;
  details?: string;
  hash?: string;
}

export interface ArchivedRecordItem {
  id: string;
  recordNumber: string;
  fileName: string;
  patientId: string;
  patientName: string;
  category: HealthRecordCategory;
  archivedDate: string;
  fileSize: string;
}

export interface UploadRecordPayload {
  file?: File | { name: string; size: number; type: string };
  patientId: string;
  patientName?: string;
  category: HealthRecordCategory;
  recordType: string;
  provider: string;
  facility: string;
  summary: string;
  clinicalNotes?: string;
}

export interface ActiveUploadItem {
  id: string;
  fileName: string;
  fileSize: string;
  progress: number;
  status: 'uploading' | 'completed' | 'duplicate_warning' | 'error';
  warningMessage?: string;
  error?: string;
}

export interface CategoryKpis {
  total: number;
  totalTrend: string;
  totalSubtitle: string;
  verified: number;
  verifiedRate: string;
  verifiedSubtitle: string;
  pending: number;
  pendingBadge: string;
  pendingSubtitle: string;
  processing: number;
  processingBadge: string;
  processingSubtitle: string;
}

export interface FetchHealthRecordsParams {
  search?: string;
  category?: string;
  patient?: string;
  provider?: string;
  facility?: string;
  recordType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  dateRange?: string;
}

export interface HealthRecordsResult {
  records: HealthRecordItem[];
  total: number;
  totalAll: number;
  totalMedical: number;
  totalDental: number;
  totalVision: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Master Patient Registry mapping for robust ID resolution
export const PATIENT_LOOKUP_MAP: Record<string, { name: string; initials: string; avatarBg: string }> = {
  // CID formats
  'CID-8472-9901': { name: 'Robert J. Sterling', initials: 'RS', avatarBg: '#3f1d8b' },
  'CID-9205-1289': { name: 'Sarah Jenkins', initials: 'SJ', avatarBg: '#00696b' },
  'CID-7731-4022': { name: 'Marcus Vance', initials: 'MV', avatarBg: '#6e3900' },
  'CID-6619-8834': { name: 'Emily Watson', initials: 'EW', avatarBg: '#00629e' },
  'CID-5512-3091': { name: 'David K. Patel', initials: 'DP', avatarBg: '#28006d' },
  'CID-9205-1289-D1': { name: 'Leo Jenkins', initials: 'LJ', avatarBg: '#00696b' },
  'CID-3341-9982': { name: 'Samantha Reed', initials: 'SR', avatarBg: '#7c5295' },
  'CID-1082-9921': { name: 'Arthur Pendelton', initials: 'AP', avatarBg: '#4a6700' },
  'CID-1192-4450': { name: 'Arthur Pendelton', initials: 'AP', avatarBg: '#4a6700' },
  'CID-4402-8819': { name: 'Clara Higgins', initials: 'CH', avatarBg: '#9a4059' },
  'CID-3928-8472': { name: 'Eleanor Vance', initials: 'EV', avatarBg: '#28006d' },
  'CID-9012-3341': { name: 'Eleanor Vance', initials: 'EV', avatarBg: '#28006d' },
  'CID-9102-4410': { name: 'Marcus Sterling', initials: 'MS', avatarBg: '#00696b' },
  'CID-1829-5520': { name: 'David K. Chen', initials: 'DC', avatarBg: '#3f1d8b' },
  'CID-7731-9011': { name: 'Elena Rostova', initials: 'ER', avatarBg: '#6e3900' },
  'CID-5521-1288': { name: 'Clara Oswald', initials: 'CO', avatarBg: '#9a4059' },
  'CID-8821-3490': { name: 'Michael B. Jordan', initials: 'MJ', avatarBg: '#00629e' },
  'CID-3312-9844': { name: 'Sophia Lorenze', initials: 'SL', avatarBg: '#7c5295' },
  'CID-2201-9912': { name: 'Lucas Davenport', initials: 'LD', avatarBg: '#4a6700' },
  'CID-4402-8820': { name: 'Rebecca Nurse', initials: 'RN', avatarBg: '#b3261e' },
  'CID-6619-8835': { name: 'James H. Watson', initials: 'JW', avatarBg: '#00629e' },

  // Vault IDs / Patient IDs from patientService.ts
  'HV-3928-8472-91': { name: 'Eleanor Vance', initials: 'EV', avatarBg: '#28006d' },
  'HV-9102-C': { name: 'Marcus Sterling', initials: 'MS', avatarBg: '#00696b' },
  'HV-4920-81': { name: 'Sarah Jenkins', initials: 'SJ', avatarBg: '#00696b' },
  'HV-1829-55': { name: 'David K. Chen', initials: 'DC', avatarBg: '#3f1d8b' },
  'HV-7731-90': { name: 'Elena Rostova', initials: 'ER', avatarBg: '#6e3900' },
  'HV-1082-99': { name: 'Arthur Pendelton', initials: 'AP', avatarBg: '#4a6700' },
  'HV-5521-12': { name: 'Clara Oswald', initials: 'CO', avatarBg: '#9a4059' },
  'HV-8821-34': { name: 'Michael B. Jordan', initials: 'MJ', avatarBg: '#00629e' },
  'HV-3312-98': { name: 'Sophia Lorenze', initials: 'SL', avatarBg: '#7c5295' },
  'HV-6619-88': { name: 'James H. Watson', initials: 'JW', avatarBg: '#00629e' },
  'HV-4402-88': { name: 'Rebecca Nurse', initials: 'RN', avatarBg: '#b3261e' },
  'HV-2201-99': { name: 'Lucas Davenport', initials: 'LD', avatarBg: '#4a6700' },
  'pat-1': { name: 'Eleanor Vance', initials: 'EV', avatarBg: '#28006d' },
  'pat-2': { name: 'Marcus Sterling', initials: 'MS', avatarBg: '#00696b' },
  'pat-3': { name: 'Sarah Jenkins', initials: 'SJ', avatarBg: '#00696b' },
  'pat-4': { name: 'David K. Chen', initials: 'DC', avatarBg: '#3f1d8b' },
  'pat-5': { name: 'Elena Rostova', initials: 'ER', avatarBg: '#6e3900' },
  'pat-6': { name: 'Arthur Pendelton', initials: 'AP', avatarBg: '#4a6700' },
  'pat-7': { name: 'Clara Oswald', initials: 'CO', avatarBg: '#9a4059' },
  'pat-8': { name: 'Michael B. Jordan', initials: 'MJ', avatarBg: '#00629e' },
  'pat-9': { name: 'Sophia Lorenze', initials: 'SL', avatarBg: '#7c5295' },
  'pat-10': { name: 'James H. Watson', initials: 'JW', avatarBg: '#00629e' },
  'pat-11': { name: 'Rebecca Nurse', initials: 'RN', avatarBg: '#b3261e' },
  'pat-12': { name: 'Lucas Davenport', initials: 'LD', avatarBg: '#4a6700' },
};

/**
 * Resolves a patient's full name from multiple possible shapes:
 * 1. Explicit patientName string
 * 2. Nested patient object (patient.fullName or patient.name)
 * 3. String patient (when name is stored in patient property)
 * 4. Resolves from patientId / vaultId using PATIENT_LOOKUP_MAP
 * 5. Fallback gracefully to 'Unknown Patient' (never undefined or null)
 */
export function resolvePatientName(record?: Partial<HealthRecordItem> | null): string {
  if (!record) return 'Unknown Patient';

  // 1. Direct patientName string
  if (typeof record.patientName === 'string' && record.patientName.trim()) {
    const trimmed = record.patientName.trim();
    if (trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== '') {
      return trimmed;
    }
  }

  // 2. Nested patient object (patient.fullName or patient.name)
  if (record.patient && typeof record.patient === 'object') {
    const pObj = record.patient as PatientNestedInfo;
    if (typeof pObj.fullName === 'string' && pObj.fullName.trim()) {
      return pObj.fullName.trim();
    }
    if (typeof pObj.name === 'string' && pObj.name.trim()) {
      return pObj.name.trim();
    }
  }

  // 3. String patient that is an actual name (not an ID)
  if (
    typeof record.patient === 'string' &&
    record.patient.trim() &&
    !record.patient.startsWith('CID-') &&
    !record.patient.startsWith('HV-') &&
    !record.patient.startsWith('pat-')
  ) {
    const trimmed = record.patient.trim();
    if (trimmed !== 'undefined' && trimmed !== 'null' && trimmed !== '') {
      return trimmed;
    }
  }

  // 4. Resolve from Patient ID or Vault ID lookup
  const candidateId =
    record.patientId ||
    (typeof record.patient === 'string' ? record.patient : (record.patient as PatientNestedInfo)?.id);

  if (candidateId) {
    const cleanId = candidateId.trim();
    if (PATIENT_LOOKUP_MAP[cleanId]) {
      return PATIENT_LOOKUP_MAP[cleanId].name;
    }
    const found = Object.entries(PATIENT_LOOKUP_MAP).find(
      ([key]) => key.toLowerCase() === cleanId.toLowerCase()
    );
    if (found) {
      return found[1].name;
    }
  }

  return 'Unknown Patient';
}

/**
 * Resolves patient initials for avatar circle.
 */
export function resolvePatientInitials(
  record?: Partial<HealthRecordItem> | null,
  nameFallback?: string
): string {
  if (record?.patientInitials && typeof record.patientInitials === 'string' && record.patientInitials.trim()) {
    return record.patientInitials.trim().slice(0, 3).toUpperCase();
  }
  const name = nameFallback || resolvePatientName(record);
  if (!name || name === 'Unknown Patient') return 'UP';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  '#3f1d8b',
  '#00696b',
  '#6e3900',
  '#00629e',
  '#7c5295',
  '#4a6700',
  '#9a4059',
  '#28006d',
];

/**
 * Resolves deterministic avatar background color.
 */
export function resolvePatientAvatarBg(
  record?: Partial<HealthRecordItem> | null,
  nameFallback?: string
): string {
  if (record?.patientAvatarBg && typeof record.patientAvatarBg === 'string' && record.patientAvatarBg.trim()) {
    return record.patientAvatarBg.trim();
  }
  const candidateId = record?.patientId;
  if (candidateId && PATIENT_LOOKUP_MAP[candidateId]?.avatarBg) {
    return PATIENT_LOOKUP_MAP[candidateId].avatarBg;
  }
  const name = nameFallback || resolvePatientName(record);
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Master dataset containing 25 Medical, 25 Dental, and 25 Vision records (75 total records)
// Each record is distinct, realistic, and fully mapped to registered CareID patients.
let healthRecordsStore: HealthRecordItem[] = [
  // ==========================================
  // MEDICAL RECORDS (25 records)
  // ==========================================
  {
    id: 'rec-10492',
    recordNumber: '#REC-10492',
    title: 'Comprehensive Metabolic Panel',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Oct 24, 2026',
    recordDateIso: '2026-10-24',
    status: 'Verified',
    summary: 'Standard 14-parameter comprehensive metabolic screening indicating stable electrolyte and kidney function.',
    clinicalNotes: 'Glucose: 94 mg/dL, BUN: 14 mg/dL, Creatinine: 0.9 mg/dL. All metabolic indices within standard reference ranges.',
    documentType: 'PDF / HL7 Lab Result',
    fileSize: '1.4 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10488',
    recordNumber: '#REC-10488',
    title: 'Cardiology Cath Lab Summary',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Medical',
    recordType: 'Clinical Summary',
    provider: 'Dr. Michael Chang',
    facility: 'Metro Heart Center',
    recordDate: 'Oct 23, 2026',
    recordDateIso: '2026-10-23',
    status: 'Verified',
    summary: 'Fluoroscopic coronary angiography procedure log and post-intervention hemodynamic stabilization chart.',
    clinicalNotes: 'Patent stent observed in proximal LAD with TIMI 3 flow restored. Patient resting comfortably with stable telemetry.',
    documentType: 'Surgical Report / PDF',
    fileSize: '4.8 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10479',
    recordNumber: '#REC-10479',
    title: 'Pediatric Immunization Record',
    patientName: 'Leo Jenkins',
    patientInitials: 'LJ',
    patientAvatarBg: '#8155ba',
    patientId: 'CID-9205-1289-D1',
    isDependent: true,
    category: 'Medical',
    recordType: 'Immunization Card',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Oct 20, 2026',
    recordDateIso: '2026-10-20',
    status: 'Verified',
    summary: 'Standard pediatric vaccine ledger verifying MMR booster and inactivated poliovirus administration.',
    clinicalNotes: 'Lot #MV-88192 administered into left deltoid. Patient observed for 15 minutes post-injection with zero adverse reaction.',
    documentType: 'Immunization Ledger',
    fileSize: '890 KB',
    ocrConfidence: 99.8,
  },
  {
    id: 'rec-10468',
    recordNumber: '#REC-10468',
    title: 'Inpatient Discharge Summary',
    patientName: 'Arthur Pendelton',
    patientInitials: 'AP',
    patientAvatarBg: '#53687e',
    patientId: 'CID-1192-4450',
    category: 'Medical',
    recordType: 'Hospital Record',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Oct 18, 2026',
    recordDateIso: '2026-10-18',
    status: 'Rejected',
    summary: 'Inpatient post-admission encounter summary flagged due to mismatched diagnostic code formatting and missing attending sign-off.',
    clinicalNotes: 'ICD-10 coding mismatch in secondary diagnosis table (I25.10 vs I21.09). Returned to medical records department for re-authentication.',
    documentType: 'Clinical Summary PDF',
    fileSize: '6.7 MB',
    ocrConfidence: 82.5,
  },
  {
    id: 'rec-10462',
    recordNumber: '#REC-10462',
    title: 'Magnetic Resonance Imaging (MRI) Brain',
    patientName: 'Eleanor Vance',
    patientInitials: 'EV',
    patientAvatarBg: '#28006d',
    patientId: 'CID-3928-8472',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Oct 16, 2026',
    recordDateIso: '2026-10-16',
    status: 'Verified',
    summary: 'Multi-planar 3T MRI of brain with and without gadolinium contrast examining ventricular volume.',
    clinicalNotes: 'No evidence of acute ischemia, hemorrhage, or mass effect. Ventricles and sulci age-appropriate.',
    documentType: 'DICOM Imaging Report',
    fileSize: '42.8 MB',
    ocrConfidence: 99.5,
  },
  {
    id: 'rec-10451',
    recordNumber: '#REC-10451',
    title: 'Glycated Hemoglobin (HbA1c) Serology',
    // Testing patient resolution from nested object
    patient: { fullName: 'Samantha Reed', id: 'CID-3341-9982' },
    patientId: 'CID-3341-9982',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Oct 12, 2026',
    recordDateIso: '2026-10-12',
    status: 'Verified',
    summary: 'High-performance liquid chromatography assay measuring 90-day glycemic equilibrium.',
    clinicalNotes: 'HbA1c: 5.6% (Reference: <5.7%). Normal non-diabetic glycemic profile maintained.',
    documentType: 'Lab Sheet PDF',
    fileSize: '820 KB',
    ocrConfidence: 99.6,
  },
  {
    id: 'rec-10420',
    recordNumber: '#REC-10420',
    title: 'Pulmonary Function Spirometry Report',
    patientName: 'Marcus Vance',
    patientInitials: 'MV',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-4022',
    category: 'Medical',
    recordType: 'Clinical Summary',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Oct 01, 2026',
    recordDateIso: '2026-10-01',
    status: 'Verified',
    summary: 'Pre- and post-bronchodilator flow volume loops evaluating forced vital capacity and expiratory volume.',
    clinicalNotes: 'FEV1/FVC ratio: 82% predicted. Normal non-obstructive spirometric pattern.',
    documentType: 'Spirometry PDF',
    fileSize: '1.3 MB',
    ocrConfidence: 99.7,
  },
  {
    id: 'rec-10418',
    recordNumber: '#REC-10418',
    title: 'Holter Telemetry 48-Hour Rhythm Analysis',
    patientName: 'David K. Patel',
    patientInitials: 'DP',
    patientAvatarBg: '#28006d',
    patientId: 'CID-5512-3091',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Michael Chang',
    facility: 'Metro Heart Center',
    recordDate: 'Sep 29, 2026',
    recordDateIso: '2026-09-29',
    status: 'Verified',
    summary: 'Continuous 2-lead ambulatory ECG logging documenting sinus rhythm with rare premature atrial complexes.',
    clinicalNotes: 'Predominant rhythm normal sinus. Average heart rate: 71 bpm. Zero runs of sustained ventricular arrhythmia.',
    documentType: 'Holter PDF Report',
    fileSize: '8.4 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10415',
    recordNumber: '#REC-10415',
    title: 'Comprehensive Lipid & Apolipoprotein Panel',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 27, 2026',
    recordDateIso: '2026-09-27',
    status: 'Verified',
    summary: 'Fasting lipid profile, total cholesterol, triglycerides, HDL, calculated LDL, and Apolipoprotein B.',
    clinicalNotes: 'Total Cholesterol: 182 mg/dL, HDL: 58 mg/dL, Triglycerides: 110 mg/dL, LDL: 102 mg/dL. Cardiovascular risk optimal.',
    documentType: 'Lab Results HL7',
    fileSize: '1.1 MB',
    ocrConfidence: 99.3,
  },
  {
    id: 'rec-10412',
    recordNumber: '#REC-10412',
    title: 'Lumbar Spine X-Ray 3-View Study',
    // Testing patient resolution from ID lookup map
    patientId: 'CID-9102-4410',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 25, 2026',
    recordDateIso: '2026-09-25',
    status: 'Verified',
    summary: 'AP, lateral, and spot oblique views of lumbar vertebrae evaluating intervertebral disc height.',
    clinicalNotes: 'Mild degenerative disc spacing narrowing at L5-S1. No spondylolisthesis or compression fractures noted.',
    documentType: 'Radiology Report PDF',
    fileSize: '14.5 MB',
    ocrConfidence: 98.2,
  },
  {
    id: 'rec-10409',
    recordNumber: '#REC-10409',
    title: 'Adult Annual Wellness & Physical Examination',
    patientName: 'David K. Chen',
    patientInitials: 'DC',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-1829-5520',
    category: 'Medical',
    recordType: 'Clinical Summary',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Sep 23, 2026',
    recordDateIso: '2026-09-23',
    status: 'Verified',
    summary: 'Annual preventive physical assessment, vital signs baseline, preventive screening schedule, and risk profiling.',
    clinicalNotes: 'BP 118/76 mmHg, BMI 23.4. Heart sounds normal S1/S2 without murmurs. Full range of motion preserved.',
    documentType: 'Encounter Note PDF',
    fileSize: '2.4 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10406',
    recordNumber: '#REC-10406',
    title: 'Post-Operative Orthopedic Progress Note',
    patientName: 'Elena Rostova',
    patientInitials: 'ER',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-9011',
    category: 'Medical',
    recordType: 'Hospital Record',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 21, 2026',
    recordDateIso: '2026-09-21',
    status: 'Pending Verification',
    summary: '4-week post-arthroscopic knee meniscectomy rehabilitation evaluation and joint effusion assessment.',
    clinicalNotes: 'Active knee flexion to 115 degrees. Mild joint effusion resolving. Patient cleared for progressive resistance physical therapy.',
    documentType: 'Clinical Progress Note',
    fileSize: '3.6 MB',
    ocrConfidence: 94.7,
  },
  {
    id: 'rec-10403',
    recordNumber: '#REC-10403',
    title: 'Thyroid Function Panel (TSH, Free T3/T4)',
    patientName: 'Clara Oswald',
    patientInitials: 'CO',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-5521-1288',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Sep 19, 2026',
    recordDateIso: '2026-09-19',
    status: 'Verified',
    summary: 'Chemiluminescent immunoassay measuring sensitive thyroid-stimulating hormone and unbound thyroid hormones.',
    clinicalNotes: 'TSH: 2.15 mIU/L (normal: 0.4-4.0). Free T4: 1.28 ng/dL. Patient is clinically and biochemically euthyroid.',
    documentType: 'Lab Results PDF',
    fileSize: '950 KB',
    ocrConfidence: 99.5,
  },
  {
    id: 'rec-10400',
    recordNumber: '#REC-10400',
    title: 'Emergency Department Trauma Flowsheet',
    patientName: 'Michael B. Jordan',
    patientInitials: 'MJ',
    patientAvatarBg: '#00629e',
    patientId: 'CID-8821-3490',
    category: 'Medical',
    recordType: 'Hospital Record',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 17, 2026',
    recordDateIso: '2026-09-17',
    status: 'Verified',
    summary: 'ED trauma triage, primary survey, hemodynamic resuscitation chart, and secondary survey logs.',
    clinicalNotes: 'GCS 15. FAST abdominal ultrasound negative for free fluid. Discharged in stable condition with primary follow-up instructions.',
    documentType: 'Emergency Record PDF',
    fileSize: '5.9 MB',
    ocrConfidence: 98.7,
  },
  {
    id: 'rec-10397',
    recordNumber: '#REC-10397',
    title: 'Seasonal Influenza & Pneumococcal Vaccine Log',
    patientName: 'Sophia Lorenze',
    patientInitials: 'SL',
    patientAvatarBg: '#7c5295',
    patientId: 'CID-3312-9844',
    category: 'Medical',
    recordType: 'Immunization Card',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Sep 15, 2026',
    recordDateIso: '2026-09-15',
    status: 'Verified',
    summary: 'Quadrivalent inactivated influenza vaccine and Pneumococcal 20-valent conjugate vaccination ledger.',
    clinicalNotes: 'Lot #FL-90214 and #PN-33812 administered intramuscularly. No vasovagal episode or erythema observed.',
    documentType: 'Vaccine Ledger PDF',
    fileSize: '680 KB',
    ocrConfidence: 99.8,
  },
  {
    id: 'rec-10394',
    recordNumber: '#REC-10394',
    title: 'Echocardiogram Transthoracic 2D Doppler',
    patientName: 'James H. Watson',
    patientInitials: 'JW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8835',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Michael Chang',
    facility: 'Metro Heart Center',
    recordDate: 'Sep 13, 2026',
    recordDateIso: '2026-09-13',
    status: 'Verified',
    summary: 'Complete transthoracic color Doppler echocardiography assessing left ventricular ejection fraction and valve competence.',
    clinicalNotes: 'LVEF calculated at 62%. Normal left ventricular chamber geometry. Trace physiological mitral regurgitation.',
    documentType: 'Cardiology Echo Report',
    fileSize: '22.4 MB',
    ocrConfidence: 99.0,
  },
  {
    id: 'rec-10391',
    recordNumber: '#REC-10391',
    title: 'Serum Ferritin & Iron Binding Capacity',
    patientName: 'Rebecca Nurse',
    patientInitials: 'RN',
    patientAvatarBg: '#b3261e',
    patientId: 'CID-4402-8820',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 11, 2026',
    recordDateIso: '2026-09-11',
    status: 'Verified',
    summary: 'Iron profile assessing serum ferritin, serum iron, total iron binding capacity (TIBC), and transferrin saturation.',
    clinicalNotes: 'Ferritin: 68 ng/mL, Iron: 88 mcg/dL, TIBC: 340 mcg/dL. Transferrin saturation 26% (optimal).',
    documentType: 'Lab Results PDF',
    fileSize: '760 KB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10388',
    recordNumber: '#REC-10388',
    title: 'Allergy Sensitization Scratch Test Matrix',
    patientName: 'Lucas Davenport',
    patientInitials: 'LD',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-2201-9912',
    category: 'Medical',
    recordType: 'Clinical Summary',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Sep 09, 2026',
    recordDateIso: '2026-09-09',
    status: 'Verified',
    summary: 'Multi-antigen percutaneous skin prick evaluation for inhalant environmental allergens and common food panels.',
    clinicalNotes: 'Positive wheal reaction (4mm) to Timothy grass pollen and Dermatophagoides farinae. Antihistamine protocol prescribed.',
    documentType: 'Allergy Chart PDF',
    fileSize: '2.8 MB',
    ocrConfidence: 98.6,
  },
  {
    id: 'rec-10385',
    recordNumber: '#REC-10385',
    title: 'Abdominal Ultrasound Real-Time Organ Scan',
    patientName: 'Emily Watson',
    patientInitials: 'EW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8834',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 07, 2026',
    recordDateIso: '2026-09-07',
    status: 'Verified',
    summary: 'B-mode ultrasound survey of liver parenchyma, gallbladder, common bile duct, pancreas, and spleen.',
    clinicalNotes: 'Gallbladder acoustic shadow-free. Liver echogenicity homogeneous. Common bile duct diameter normal at 3.8mm.',
    documentType: 'Ultrasound Report PDF',
    fileSize: '16.8 MB',
    ocrConfidence: 99.2,
  },
  {
    id: 'rec-10382',
    recordNumber: '#REC-10382',
    title: 'Complete Blood Count (CBC) with Differential',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 05, 2026',
    recordDateIso: '2026-09-05',
    status: 'Verified',
    summary: 'Automated hematology analyzer count evaluating WBC, RBC, hemoglobin, hematocrit, platelets, and leukocyte differential.',
    clinicalNotes: 'WBC: 6.8 K/uL, Hemoglobin: 14.8 g/dL, Platelets: 245 K/uL. Leukocyte differential balanced with no immature blasts.',
    documentType: 'Lab Results PDF',
    fileSize: '840 KB',
    ocrConfidence: 99.7,
  },
  {
    id: 'rec-10379',
    recordNumber: '#REC-10379',
    title: 'Hospital Day-Surgery Post-Anesthesia Note',
    patientName: 'Clara Higgins',
    patientInitials: 'CH',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-4402-8819',
    category: 'Medical',
    recordType: 'Hospital Record',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Sep 03, 2026',
    recordDateIso: '2026-09-03',
    status: 'Verified',
    summary: 'Phase I and Phase II PACU discharge score chart confirming full recovery of airway reflexes and pain control.',
    clinicalNotes: 'Aldrete recovery score 10/10. Tolerating oral fluids without nausea. Ambulating safely with escort.',
    documentType: 'PACU Flowsheet PDF',
    fileSize: '3.1 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10376',
    recordNumber: '#REC-10376',
    title: 'Renal Function & Urinalysis Microscopic Exam',
    patientName: 'Eleanor Vance',
    patientInitials: 'EV',
    patientAvatarBg: '#28006d',
    patientId: 'CID-3928-8472',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Sep 01, 2026',
    recordDateIso: '2026-09-01',
    status: 'Verified',
    summary: 'Automated dipstick and automated sediment microscopy inspecting protein, glucose, ketones, and cellular casts.',
    clinicalNotes: 'Negative for proteinuria and hematuria. Specific gravity 1.018. Estimated glomerular filtration rate (eGFR) >90 mL/min.',
    documentType: 'Urinalysis Report PDF',
    fileSize: '790 KB',
    ocrConfidence: 99.5,
  },
  {
    id: 'rec-10373',
    recordNumber: '#REC-10373',
    title: 'Chest Radiograph PA & Lateral View',
    patientName: 'Marcus Sterling',
    patientInitials: 'MS',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9102-4410',
    category: 'Medical',
    recordType: 'Diagnostic Radiology',
    provider: 'Dr. Julian Vance',
    facility: 'Metro Hospital',
    recordDate: 'Aug 29, 2026',
    recordDateIso: '2026-08-29',
    status: 'Verified',
    summary: 'Digital high-definition PA and lateral chest film evaluating cardiothoracic ratio and pulmonary parenchymal clarity.',
    clinicalNotes: 'Lungs clear bilaterally without consolidation or pleural effusion. Cardiomediastinal silhouette normal.',
    documentType: 'Chest X-Ray DICOM',
    fileSize: '12.2 MB',
    ocrConfidence: 99.3,
  },
  {
    id: 'rec-10370',
    recordNumber: '#REC-10370',
    title: 'Vitamin D (25-Hydroxy) Serology Check',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Medical',
    recordType: 'Laboratory Report',
    provider: 'Dr. Sarah Wilson',
    facility: 'Family Health Clinic',
    recordDate: 'Aug 26, 2026',
    recordDateIso: '2026-08-26',
    status: 'Pending Verification',
    summary: 'Liquid chromatography tandem mass spectrometry assay checking total 25-OH Vitamin D2 and D3 levels.',
    clinicalNotes: '25-OH Vitamin D: 38 ng/mL (Optimal range: 30-80 ng/mL). Dietary supplementation recommendation pending physician signoff.',
    documentType: 'Lab Results PDF',
    fileSize: '810 KB',
    ocrConfidence: 96.1,
  },
  {
    id: 'rec-10367',
    recordNumber: '#REC-10367',
    title: 'Inpatient Cardiology Telemetry Consultation',
    patientName: 'Arthur Pendelton',
    patientInitials: 'AP',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-1082-9921',
    category: 'Medical',
    recordType: 'Clinical Summary',
    provider: 'Dr. Michael Chang',
    facility: 'Metro Heart Center',
    recordDate: 'Aug 24, 2026',
    recordDateIso: '2026-08-24',
    status: 'Verified',
    summary: 'Subspecialty cardiology inpatient evaluation regarding medication titration for essential hypertension.',
    clinicalNotes: 'ACE inhibitor titrated appropriately. Target seated blood pressure achieved (<130/80 mmHg). Discharged to outpatient cadence.',
    documentType: 'Consultation Note PDF',
    fileSize: '2.9 MB',
    ocrConfidence: 99.1,
  },

  // ==========================================
  // DENTAL RECORDS (25 records)
  // ==========================================
  {
    id: 'rec-10491',
    recordNumber: '#REC-10491',
    title: 'Full Panoramic OPG X-Ray',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Oct 24, 2026',
    recordDateIso: '2026-10-24',
    status: 'Verified',
    summary: 'High-resolution digital orthopantomogram evaluating mandibular and maxillary bone density and dental arches.',
    clinicalNotes: 'Third molar impaction noted on lower quadrant 4. No periapical radiolucencies detected.',
    documentType: 'DICOM Radiograph',
    fileSize: '18.2 MB',
    ocrConfidence: 98.8,
  },
  {
    id: 'rec-10485',
    recordNumber: '#REC-10485',
    title: 'Bitewing Radiograph & Hygiene',
    patientName: 'Emily Watson',
    patientInitials: 'EW',
    patientAvatarBg: '#00696b',
    patientId: 'CID-6619-8834',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Oct 22, 2026',
    recordDateIso: '2026-10-22',
    status: 'Verified',
    summary: 'Annual preventive periodontal evaluation, coronal scaling, and 4-film interproximal bitewing radiographs.',
    clinicalNotes: 'Sulcus depths stable at 2-3mm across all sextants. Minor calculus debrided without complication.',
    documentType: 'Dental Chart / PDF',
    fileSize: '3.1 MB',
    ocrConfidence: 97.9,
  },
  {
    id: 'rec-10474',
    recordNumber: '#REC-10474',
    title: 'Endodontic Treatment Report',
    patientName: 'Samantha Reed',
    patientInitials: 'SR',
    patientAvatarBg: '#00a2a4',
    patientId: 'CID-3341-9982',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Oct 19, 2026',
    recordDateIso: '2026-10-19',
    status: 'Verified',
    summary: 'Single-visit rotary root canal therapy on tooth #19 with warm vertical gutta-percha condensation.',
    clinicalNotes: 'Canals thoroughly instrumented to size 35.04. Post-operative seal verified via apex locator and confirmation radiograph.',
    documentType: 'Procedure Report',
    fileSize: '5.2 MB',
    ocrConfidence: 98.4,
  },
  {
    id: 'rec-10459',
    recordNumber: '#REC-10459',
    title: 'Periodontal Charting & Pocket Depth Analysis',
    patientName: 'David K. Patel',
    patientInitials: 'DP',
    patientAvatarBg: '#6a4fa3',
    patientId: 'CID-5512-3091',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Oct 15, 2026',
    recordDateIso: '2026-10-15',
    status: 'Verified',
    summary: 'Full mouth 6-point periodontal depth mapping assessing bleeding on probing and furcation involvement.',
    clinicalNotes: 'Mild localized bleeding on probing at tooth #30. Plaque index 18%. Hygiene instruction reinforced.',
    documentType: 'Dental Charting PDF',
    fileSize: '1.9 MB',
    ocrConfidence: 97.4,
  },
  {
    id: 'rec-10447',
    recordNumber: '#REC-10447',
    title: 'Composite Restoration & Cavity Prep',
    patientName: 'Arthur Pendelton',
    patientInitials: 'AP',
    patientAvatarBg: '#53687e',
    patientId: 'CID-1192-4450',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Oct 10, 2026',
    recordDateIso: '2026-10-10',
    status: 'Verified',
    summary: 'Class II mesio-occlusal composite restoration placed under rubber dam isolation on tooth #14.',
    clinicalNotes: 'Caries completely excavated without pulpal involvement. Shade A2 nanofill composite light-cured and polished.',
    documentType: 'Operative Note PDF',
    fileSize: '2.1 MB',
    ocrConfidence: 98.2,
  },
  {
    id: 'rec-10435',
    recordNumber: '#REC-10435',
    title: 'CBCT 3D Implant Bone Mapping',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Oct 07, 2026',
    recordDateIso: '2026-10-07',
    status: 'Pending Verification',
    summary: 'Cone beam computed tomography volumetric rendering for posterior mandibular implant site dimensions.',
    clinicalNotes: 'Bone height at site #30: 11.8mm with 7.2mm ridge width. Mental foramen identified with 3.5mm safety clearance.',
    documentType: 'DICOM Volumetric CT',
    fileSize: '36.5 MB',
    ocrConfidence: 95.8,
  },
  {
    id: 'rec-10428',
    recordNumber: '#REC-10428',
    title: 'Orthodontic Cephalometric Tracing',
    patientName: 'Leo Jenkins',
    patientInitials: 'LJ',
    patientAvatarBg: '#8155ba',
    patientId: 'CID-9205-1289-D1',
    isDependent: true,
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Oct 03, 2026',
    recordDateIso: '2026-10-03',
    status: 'Verified',
    summary: 'Lateral cephalogram digitization assessing sagittal skeletal relationship (SNA, SNB, ANB angles).',
    clinicalNotes: 'ANB angle: 2.5 degrees indicating Class I skeletal pattern. Moderate maxillary incisor proclination noted.',
    documentType: 'Orthodontic Tracing PDF',
    fileSize: '7.8 MB',
    ocrConfidence: 98.6,
  },
  {
    id: 'rec-10425',
    recordNumber: '#REC-10425',
    title: 'Porcelain Crown Prep & Digital Impression',
    patientName: 'Eleanor Vance',
    patientInitials: 'EV',
    patientAvatarBg: '#28006d',
    patientId: 'CID-3928-8472',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Oct 02, 2026',
    recordDateIso: '2026-10-02',
    status: 'Verified',
    summary: 'Full contour zirconia crown preparation and intraoral optical 3D scanning on maxillary premolar #4.',
    clinicalNotes: '0.8mm chamfer margin prepared supragingivally. Digital STL scan submitted to dental prosthetic lab.',
    documentType: 'Crown Chart PDF',
    fileSize: '14.2 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10422',
    recordNumber: '#REC-10422',
    title: 'Dental Scaling & Root Planing (Quadrant 1)',
    patientName: 'Marcus Sterling',
    patientInitials: 'MS',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9102-4410',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 29, 2026',
    recordDateIso: '2026-09-29',
    status: 'Verified',
    summary: 'Therapeutic ultrasonic subgingival debridement and hand curettage under local infiltration anesthesia.',
    clinicalNotes: 'Root surfaces smoothed thoroughly. Chlorhexidine 0.12% irrigation applied. Healing check scheduled in 4 weeks.',
    documentType: 'Periodontal Note PDF',
    fileSize: '2.5 MB',
    ocrConfidence: 98.3,
  },
  {
    id: 'rec-10419',
    recordNumber: '#REC-10419',
    title: 'Diagnostic Occlusal Guard Fabrication',
    patientName: 'David K. Chen',
    patientInitials: 'DC',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-1829-5520',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 27, 2026',
    recordDateIso: '2026-09-27',
    status: 'Verified',
    summary: 'Custom hard-soft nocturnal occlusal appliance delivery and mutually protected occlusion verification.',
    clinicalNotes: 'Appliance adjusted with articulating ribbon to verify canine guidance and eliminate balancing interferences.',
    documentType: 'Prosthetic Chart PDF',
    fileSize: '1.8 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10416',
    recordNumber: '#REC-10416',
    title: 'Surgical Extraction of Impacted Third Molar',
    patientName: 'Elena Rostova',
    patientInitials: 'ER',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-9011',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 25, 2026',
    recordDateIso: '2026-09-25',
    status: 'Verified',
    summary: 'Full bony impaction surgical odontectomy with sectioning of crown and roots under local blocks.',
    clinicalNotes: 'Hemostasis confirmed with gelatin sponge and 4-0 chromic gut sutures. Post-op analgesics prescribed.',
    documentType: 'Oral Surgery Note PDF',
    fileSize: '4.6 MB',
    ocrConfidence: 99.0,
  },
  {
    id: 'rec-10413',
    recordNumber: '#REC-10413',
    title: 'Comprehensive Odontogram & Caries Risk Profile',
    patientName: 'Clara Oswald',
    patientInitials: 'CO',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-5521-1288',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 23, 2026',
    recordDateIso: '2026-09-23',
    status: 'Verified',
    summary: 'Complete tooth-by-tooth charting, existing restoration audit, CAMBRA caries risk assessment scoring.',
    clinicalNotes: 'CAMBRA score: Moderate. High-fluoride dentifrice 5000 ppm recommended. Recall scheduled for 6 months.',
    documentType: 'Odontogram Chart PDF',
    fileSize: '3.2 MB',
    ocrConfidence: 98.7,
  },
  {
    id: 'rec-10410',
    recordNumber: '#REC-10410',
    title: 'Gingival Bleeding & Plaque Index Review',
    patientName: 'Michael B. Jordan',
    patientInitials: 'MJ',
    patientAvatarBg: '#00629e',
    patientId: 'CID-8821-3490',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 21, 2026',
    recordDateIso: '2026-09-21',
    status: 'Verified',
    summary: 'Silness-Löe plaque index charting and Sulcus Bleeding Index (SBI) assessment across all arches.',
    clinicalNotes: 'Plaque score reduced from 34% to 12%. Interdental brush technique demonstrated and approved.',
    documentType: 'Hygiene Score PDF',
    fileSize: '1.4 MB',
    ocrConfidence: 99.6,
  },
  {
    id: 'rec-10407',
    recordNumber: '#REC-10407',
    title: 'Anterior Composite Veneer Esthetic Prep',
    patientName: 'Sophia Lorenze',
    patientInitials: 'SL',
    patientAvatarBg: '#7c5295',
    patientId: 'CID-3312-9844',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 19, 2026',
    recordDateIso: '2026-09-19',
    status: 'Verified',
    summary: 'Direct resin composite layering on maxillary incisors #8 and #9 for diastema closure.',
    clinicalNotes: 'Polychromatic layering using enamel and dentin shades. Polished with spiral diamond wheels for natural luster.',
    documentType: 'Cosmetic Dental Note PDF',
    fileSize: '3.9 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10404',
    recordNumber: '#REC-10404',
    title: 'Temporomandibular Joint (TMJ) Palpation & Range',
    patientName: 'James H. Watson',
    patientInitials: 'JW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8835',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 17, 2026',
    recordDateIso: '2026-09-17',
    status: 'Verified',
    summary: 'Bilateral TMJ auscultation, masseter muscle palpation, and maximum comfortable incisal opening measurement.',
    clinicalNotes: 'Max opening: 46mm without deviation. Mild right lateral pterygoid tenderness. Heat therapy recommended.',
    documentType: 'TMJ Diagnostic PDF',
    fileSize: '2.1 MB',
    ocrConfidence: 97.9,
  },
  {
    id: 'rec-10401',
    recordNumber: '#REC-10401',
    title: 'Dental Implant Fixture Placement Log',
    patientName: 'Rebecca Nurse',
    patientInitials: 'RN',
    patientAvatarBg: '#b3261e',
    patientId: 'CID-4402-8820',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 15, 2026',
    recordDateIso: '2026-09-15',
    status: 'Verified',
    summary: 'Surgical placement of 4.3 x 10mm titanium endosseous implant fixture into healed osteotomy site #19.',
    clinicalNotes: 'Insertion torque: 40 Ncm achieved. Resonance frequency analysis (ISQ) measured at 74. Cover screw placed.',
    documentType: 'Implant Surgery Report',
    fileSize: '6.4 MB',
    ocrConfidence: 99.2,
  },
  {
    id: 'rec-10398',
    recordNumber: '#REC-10398',
    title: 'Pediatric Dental Topical Fluoride Application',
    patientName: 'Lucas Davenport',
    patientInitials: 'LD',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-2201-9912',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 13, 2026',
    recordDateIso: '2026-09-13',
    status: 'Verified',
    summary: 'Pediatric dental examination, pit and fissure sealant verification, and 5% sodium fluoride varnish application.',
    clinicalNotes: 'Primary dentition caries-free. Sealants on first permanent molars #3 and #14 intact.',
    documentType: 'Pediatric Chart PDF',
    fileSize: '1.2 MB',
    ocrConfidence: 99.7,
  },
  {
    id: 'rec-10395',
    recordNumber: '#REC-10395',
    title: 'Periapical Radiographic Series Quadrant 2',
    patientName: 'Marcus Vance',
    patientInitials: 'MV',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-4022',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 11, 2026',
    recordDateIso: '2026-09-11',
    status: 'Verified',
    summary: 'High-definition digital periapical radiographs checking apical periodontal ligament space on teeth #12-#15.',
    clinicalNotes: 'Continuous lamina dura visualized along root apices. No evidence of cystic change or external root resorption.',
    documentType: 'Periapical DICOM',
    fileSize: '8.7 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10392',
    recordNumber: '#REC-10392',
    title: 'Dental Crown Cementation & Contact Check',
    patientName: 'Clara Higgins',
    patientInitials: 'CH',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-4402-8819',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 09, 2026',
    recordDateIso: '2026-09-09',
    status: 'Verified',
    summary: 'Final cementation of monolithic zirconia crown on tooth #30 with resin-modified glass ionomer cement.',
    clinicalNotes: 'Marginal adaptation verified with fine explorer. Proximal contacts floss-checked. Occlusion checked with 8um foil.',
    documentType: 'Cementation Note PDF',
    fileSize: '2.3 MB',
    ocrConfidence: 99.0,
  },
  {
    id: 'rec-10389',
    recordNumber: '#REC-10389',
    title: 'Invisalign Clear Aligner Progress Tracking',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Dental',
    recordType: 'Dental Examination',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 07, 2026',
    recordDateIso: '2026-09-07',
    status: 'Verified',
    summary: 'Stage 14 aligner tracking check, interproximal reduction (IPR) verification, attachment retention assessment.',
    clinicalNotes: 'Aligner seating 100% congruent. Tooth rotation on #7 correcting ahead of projected ClinCheck staging schedule.',
    documentType: 'Orthodontic Log PDF',
    fileSize: '4.8 MB',
    ocrConfidence: 98.7,
  },
  {
    id: 'rec-10386',
    recordNumber: '#REC-10386',
    title: 'Subgingival Irrigation & Pocket Disinfection',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 05, 2026',
    recordDateIso: '2026-09-05',
    status: 'Verified',
    summary: 'Targeted antimicrobial subgingival irrigation with minocycline microspheres for persistent 5mm pocket.',
    clinicalNotes: 'Controlled-release delivery applied to mesial pocket of tooth #18. Post-irrigation home care reviewed.',
    documentType: 'Periodontal Chart PDF',
    fileSize: '1.9 MB',
    ocrConfidence: 98.4,
  },
  {
    id: 'rec-10383',
    recordNumber: '#REC-10383',
    title: 'Dental Pulp Vitality Electric & Cold Testing',
    patientName: 'Emily Watson',
    patientInitials: 'EW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8834',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Keith Miller',
    facility: 'City Dental Specialists',
    recordDate: 'Sep 03, 2026',
    recordDateIso: '2026-09-03',
    status: 'Verified',
    summary: 'Endodontic diagnostic pulp testing using Endo-Ice (refrigerant spray) and electric pulp tester (EPT).',
    clinicalNotes: 'Tooth #12 responds normally with immediate response that dissipates in 2 seconds. Reversible pulpitis diagnosis.',
    documentType: 'Diagnostic Chart PDF',
    fileSize: '1.5 MB',
    ocrConfidence: 99.2,
  },
  {
    id: 'rec-10380',
    recordNumber: '#REC-10380',
    title: 'Pre-Surgical Orthognathic Model Analysis',
    patientName: 'David K. Patel',
    patientInitials: 'DP',
    patientAvatarBg: '#28006d',
    patientId: 'CID-5512-3091',
    category: 'Dental',
    recordType: 'Dental Diagnostic',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Sep 01, 2026',
    recordDateIso: '2026-09-01',
    status: 'Pending Verification',
    summary: 'Facebow transfer, semi-adjustable articulator mounting, and surgical splint digital mock-up.',
    clinicalNotes: 'Dental cast discrepancies evaluated in centric relation. Awaiting maxillofacial surgeon joint consultation note.',
    documentType: 'Surgical Model PDF',
    fileSize: '9.4 MB',
    ocrConfidence: 95.2,
  },
  {
    id: 'rec-10377',
    recordNumber: '#REC-10377',
    title: 'Dental Enamel Microabrasion & Remineralization',
    patientName: 'Eleanor Vance',
    patientInitials: 'EV',
    patientAvatarBg: '#28006d',
    patientId: 'CID-3928-8472',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Aug 29, 2026',
    recordDateIso: '2026-08-29',
    status: 'Verified',
    summary: 'Superficial enamel microabrasion using 6.6% hydrochloric acid silica compound for post-orthodontic white spot lesions.',
    clinicalNotes: 'Four 30-second applications completed under rubber dam. Casein phosphopeptide-amorphous calcium phosphate paste applied.',
    documentType: 'Operative Summary PDF',
    fileSize: '2.7 MB',
    ocrConfidence: 98.6,
  },
  {
    id: 'rec-10374',
    recordNumber: '#REC-10374',
    title: 'Dental Emergency Crown Recementation Log',
    patientName: 'Samantha Reed',
    patientInitials: 'SR',
    patientAvatarBg: '#7c5295',
    patientId: 'CID-3341-9982',
    category: 'Dental',
    recordType: 'Dental Procedure',
    provider: 'Dr. Aris Evans',
    facility: 'Apex Dental Center',
    recordDate: 'Aug 27, 2026',
    recordDateIso: '2026-08-27',
    status: 'Verified',
    summary: 'Emergency recementation of dislodged porcelain-fused-to-metal crown on abutment tooth #5.',
    clinicalNotes: 'Abutment tooth cleaned with pumice, dried, and treated with polycarboxylate cement. Crown seated securely.',
    documentType: 'Emergency Note PDF',
    fileSize: '1.6 MB',
    ocrConfidence: 99.5,
  },

  // ==========================================
  // VISION RECORDS (25 records)
  // ==========================================
  {
    id: 'rec-10490',
    recordNumber: '#REC-10490',
    title: 'Optical Coherence Tomography (OCT)',
    patientName: 'Marcus Vance',
    patientInitials: 'MV',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-4022',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 23, 2026',
    recordDateIso: '2026-10-23',
    status: 'Pending Verification',
    summary: 'Cross-sectional retinal imaging evaluating central macular thickness and nerve fiber layer integrity.',
    clinicalNotes: 'Central foveal thickness measures 245 µm. Awaiting secondary biometric review from attending ophthalmologist.',
    documentType: 'DICOM / High-Res Scan',
    fileSize: '24.6 MB',
    ocrConfidence: 94.2,
  },
  {
    id: 'rec-10482',
    recordNumber: '#REC-10482',
    title: 'Digital Fundus & Refraction Exam',
    patientName: 'David K. Patel',
    patientInitials: 'DP',
    patientAvatarBg: '#6a4fa3',
    patientId: 'CID-5512-3091',
    category: 'Vision',
    recordType: 'Vision Prescription',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 21, 2026',
    recordDateIso: '2026-10-21',
    status: 'Pending Verification',
    summary: 'Automated keratorefractometry and 45-degree digital retinal photography for progressive astigmatic correction.',
    clinicalNotes: 'OD: -2.75 -0.75 x 180, OS: -3.00 -1.00 x 175. Intraocular pressures normal at 14 mmHg OU. Prescription pending doctor signature.',
    documentType: 'Prescription PDF',
    fileSize: '2.2 MB',
    ocrConfidence: 96.0,
  },
  {
    id: 'rec-10465',
    recordNumber: '#REC-10465',
    title: 'Slit Lamp Biomicroscopy Report',
    patientName: 'Clara Higgins',
    patientInitials: 'CH',
    patientAvatarBg: '#9e4a2c',
    patientId: 'CID-4402-8819',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 17, 2026',
    recordDateIso: '2026-10-17',
    status: 'Verified',
    summary: 'Anterior segment biomicroscopy evaluating corneal endothelial cell symmetry and tear film breakup time.',
    clinicalNotes: 'Cornea clear without infiltrates or epithelial defects. TBUT measured at 11 seconds bilaterally. Artificial tears recommended.',
    documentType: 'Ophthalmology Exam Report',
    fileSize: '3.4 MB',
    ocrConfidence: 99.2,
  },
  {
    id: 'rec-10455',
    recordNumber: '#REC-10455',
    title: 'Visual Field Humphrey 24-2 Threshold Test',
    patientName: 'Marcus Vance',
    patientInitials: 'MV',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-4022',
    category: 'Vision',
    recordType: 'Visual Field Test',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 14, 2026',
    recordDateIso: '2026-10-14',
    status: 'Verified',
    summary: 'Automated perimetry examining peripheral and central visual sensitivity for glaucomatous field loss.',
    clinicalNotes: 'Reliability indices excellent: fixation losses <5%, false positives 0%. Mean deviation within normal limits.',
    documentType: 'Perimetry Graph PDF',
    fileSize: '2.5 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10442',
    recordNumber: '#REC-10442',
    title: 'Corneal Pachymetry & Endothelial Count',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Vision',
    recordType: 'Biomicroscopy',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 09, 2026',
    recordDateIso: '2026-10-09',
    status: 'Verified',
    summary: 'Non-contact ultrasonic pachymetry measuring central corneal thickness and specular microscopic endothelial cell density.',
    clinicalNotes: 'OD central thickness: 542 µm, OS: 538 µm. Endothelial cell density 2,750 cells/mm² with good hexagonality.',
    documentType: 'Ophthalmic Scan PDF',
    fileSize: '4.2 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10431',
    recordNumber: '#REC-10431',
    title: 'Binocular Indirect Ophthalmoscopy',
    patientName: 'Eleanor Vance',
    patientInitials: 'EV',
    patientAvatarBg: '#28006d',
    patientId: 'CID-3928-8472',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 05, 2026',
    recordDateIso: '2026-10-05',
    status: 'Verified',
    summary: 'Dilated peripheral retinal examination with 20D condenser lens and scleral depression.',
    clinicalNotes: 'Ora serrata examined 360 degrees. Peripheral retina intact without tears, lattice degeneration, or detachment.',
    documentType: 'Clinical Chart PDF',
    fileSize: '1.8 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10427',
    recordNumber: '#REC-10427',
    title: 'Goldmann Applanation Tonometry Series',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Vision',
    recordType: 'Biomicroscopy',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 04, 2026',
    recordDateIso: '2026-10-04',
    status: 'Verified',
    summary: 'Goldmann slit lamp applanation measuring bilateral intraocular pressures corrected for central pachymetry.',
    clinicalNotes: 'IOP OD: 15 mmHg, OS: 16 mmHg. Corneal hysteresis normal. Optic nerve cup-to-disc ratio 0.35 symmetric.',
    documentType: 'Tonometry Log PDF',
    fileSize: '1.2 MB',
    ocrConfidence: 99.7,
  },
  {
    id: 'rec-10424',
    recordNumber: '#REC-10424',
    title: 'High-Resolution 200° Optos Retinal Scan',
    patientName: 'Samantha Reed',
    patientInitials: 'SR',
    patientAvatarBg: '#7c5295',
    patientId: 'CID-3341-9982',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Oct 02, 2026',
    recordDateIso: '2026-10-02',
    status: 'Verified',
    summary: 'Ultra-widefield scanning laser ophthalmoscopy capturing 200-degree view of sensory retina and choroid.',
    clinicalNotes: 'Vascular caliber normal without microaneurysms or hard exudates. Macular pigment density adequate.',
    documentType: 'Optos Ultra-Widefield Scan',
    fileSize: '32.1 MB',
    ocrConfidence: 99.6,
  },
  {
    id: 'rec-10421',
    recordNumber: '#REC-10421',
    title: 'Progressive Bifocal Ophthalmic Prescription',
    patientName: 'Emily Watson',
    patientInitials: 'EW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8834',
    category: 'Vision',
    recordType: 'Vision Prescription',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 30, 2026',
    recordDateIso: '2026-09-30',
    status: 'Verified',
    summary: 'Manifest subjective refraction prescribing digital free-form progressive addition lenses with anti-reflective coating.',
    clinicalNotes: 'OD: +1.25 -0.50 x 090, OS: +1.50 -0.25 x 085. Add: +2.25 D OU. Pupillary distance: 63mm.',
    documentType: 'Prescription PDF',
    fileSize: '1.1 MB',
    ocrConfidence: 99.8,
  },
  {
    id: 'rec-10417',
    recordNumber: '#REC-10417',
    title: 'Corneal Topography & Elevation Mapping',
    patientName: 'Arthur Pendelton',
    patientInitials: 'AP',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-1082-9921',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 28, 2026',
    recordDateIso: '2026-09-28',
    status: 'Verified',
    summary: 'Placido disc and Scheimpflug elevation tomography examining corneal curvature and sagittal power.',
    clinicalNotes: 'Keratometry OD: 43.50 / 44.25 @ 90. No keratoconic steepening or anterior elevation anomaly.',
    documentType: 'Topography Scan PDF',
    fileSize: '19.4 MB',
    ocrConfidence: 99.0,
  },
  {
    id: 'rec-10414',
    recordNumber: '#REC-10414',
    title: 'Ishihara 38-Plate Color Vision Examination',
    patientName: 'David K. Chen',
    patientInitials: 'DC',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-1829-5520',
    category: 'Vision',
    recordType: 'Visual Field Test',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 26, 2026',
    recordDateIso: '2026-09-26',
    status: 'Verified',
    summary: 'Pseudoisochromatic plate test evaluating congenital and acquired red-green and blue-yellow color deficiencies.',
    clinicalNotes: 'Score 38/38 correct plates under standard daylight illuminant C. Normal trichromatic color vision.',
    documentType: 'Color Vision Log PDF',
    fileSize: '1.3 MB',
    ocrConfidence: 99.9,
  },
  {
    id: 'rec-10411',
    recordNumber: '#REC-10411',
    title: 'Macular Pigment Optical Density (MPOD) Scan',
    patientName: 'Marcus Sterling',
    patientInitials: 'MS',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9102-4410',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 24, 2026',
    recordDateIso: '2026-09-24',
    status: 'Verified',
    summary: 'Heterochromatic flicker photometry measuring lutein and zeaxanthin optical density within the fovea.',
    clinicalNotes: 'MPOD index: 0.52 (healthy range >0.44). Blue light filtration defense optimal.',
    documentType: 'Diagnostic Report PDF',
    fileSize: '2.6 MB',
    ocrConfidence: 98.5,
  },
  {
    id: 'rec-10408',
    recordNumber: '#REC-10408',
    title: 'Dry Eye Ocular Surface Disease Index (OSDI)',
    patientName: 'Elena Rostova',
    patientInitials: 'ER',
    patientAvatarBg: '#6e3900',
    patientId: 'CID-7731-9011',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 22, 2026',
    recordDateIso: '2026-09-22',
    status: 'Verified',
    summary: 'Fluorescein corneal staining, lissamine green conjunctival grading, and Schirmer tear test without anesthesia.',
    clinicalNotes: 'Schirmer test OD: 14mm/5min, OS: 13mm/5min. Mild meibomian gland dysfunction. Warm compresses indicated.',
    documentType: 'Dry Eye Workup PDF',
    fileSize: '2.0 MB',
    ocrConfidence: 99.2,
  },
  {
    id: 'rec-10405',
    recordNumber: '#REC-10405',
    title: 'Gonioscopy Angle Evaluation & Trabecular Meshwork',
    patientName: 'Clara Oswald',
    patientInitials: 'CO',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-5521-1288',
    category: 'Vision',
    recordType: 'Biomicroscopy',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 20, 2026',
    recordDateIso: '2026-09-20',
    status: 'Verified',
    summary: 'Four-mirror Zeiss gonioscopy assessing iridocorneal drainage angle width and pigmentation in all four quadrants.',
    clinicalNotes: 'Shaffer Grade 4 open angles in all quadrants. Ciliary body band clearly visualized. Zero peripheral anterior synechiae.',
    documentType: 'Gonioscopy Note PDF',
    fileSize: '2.8 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10402',
    recordNumber: '#REC-10402',
    title: 'Toric Soft Contact Lens Fitting & Over-Refraction',
    patientName: 'Michael B. Jordan',
    patientInitials: 'MJ',
    patientAvatarBg: '#00629e',
    patientId: 'CID-8821-3490',
    category: 'Vision',
    recordType: 'Vision Prescription',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 18, 2026',
    recordDateIso: '2026-09-18',
    status: 'Verified',
    summary: 'Silicone hydrogel toric diagnostic trial lens evaluation, rotational stability check, and tear clearance.',
    clinicalNotes: 'Lens laser markings stable at 6 o-clock position with rapid re-orientation upon blink. Plano over-refraction.',
    documentType: 'Contact Lens RX PDF',
    fileSize: '1.5 MB',
    ocrConfidence: 99.5,
  },
  {
    id: 'rec-10399',
    recordNumber: '#REC-10399',
    title: 'Contrast Sensitivity Pelli-Robson Charting',
    patientName: 'Sophia Lorenze',
    patientInitials: 'SL',
    patientAvatarBg: '#7c5295',
    patientId: 'CID-3312-9844',
    category: 'Vision',
    recordType: 'Visual Field Test',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 16, 2026',
    recordDateIso: '2026-09-16',
    status: 'Verified',
    summary: 'Low-contrast letter acuity assessment measuring log contrast sensitivity at 1 meter test distance.',
    clinicalNotes: 'Log contrast sensitivity: 1.80 OU (Normal adult score >1.65). Good functional night driving vision capability.',
    documentType: 'Visual Function PDF',
    fileSize: '1.2 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10396',
    recordNumber: '#REC-10396',
    title: 'Fluorescein Angiography Retinal Transit Log',
    patientName: 'James H. Watson',
    patientInitials: 'JW',
    patientAvatarBg: '#00629e',
    patientId: 'CID-6619-8835',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 14, 2026',
    recordDateIso: '2026-09-14',
    status: 'Verified',
    summary: 'Dynamic intravenous sodium fluorescein dye video angiography examining retinal arteriovenous transit phases.',
    clinicalNotes: 'Arteriovenous transit time 11.2 seconds. Capillary bed intact with normal foveal avascular zone (FAZ).',
    documentType: 'Angiography Scan DICOM',
    fileSize: '48.2 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10393',
    recordNumber: '#REC-10393',
    title: 'Diabetic Retinopathy Tele-Screening AI Report',
    patientName: 'Rebecca Nurse',
    patientInitials: 'RN',
    patientAvatarBg: '#b3261e',
    patientId: 'CID-4402-8820',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 12, 2026',
    recordDateIso: '2026-09-12',
    status: 'Verified',
    summary: 'Autonomous FDA-cleared AI fundus image diagnostic analysis verifying absence of diabetic microvascular changes.',
    clinicalNotes: 'AI diagnostic output: Negative for more than mild diabetic retinopathy (mtmDR). Review confirmed by Dr. Rostova.',
    documentType: 'AI Audit Report PDF',
    fileSize: '4.5 MB',
    ocrConfidence: 99.8,
  },
  {
    id: 'rec-10390',
    recordNumber: '#REC-10390',
    title: 'Pupillometry & Dynamic Pupillary Light Reflex',
    patientName: 'Lucas Davenport',
    patientInitials: 'LD',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-2201-9912',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 10, 2026',
    recordDateIso: '2026-09-10',
    status: 'Verified',
    summary: 'Infrared automated dynamic pupillometer recording scotopic baseline diameter, constriction latency, and velocity.',
    clinicalNotes: 'Symmetric pupillary responses OU without relative afferent pupillary defect (RAPD). Constriction velocity 4.2 mm/s.',
    documentType: 'Neurologic Eye Log PDF',
    fileSize: '2.1 MB',
    ocrConfidence: 99.3,
  },
  {
    id: 'rec-10387',
    recordNumber: '#REC-10387',
    title: 'Cataract Pre-Operative Optical Biometry (IOL Master)',
    patientName: 'Arthur Pendelton',
    patientInitials: 'AP',
    patientAvatarBg: '#4a6700',
    patientId: 'CID-1082-9921',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 08, 2026',
    recordDateIso: '2026-09-08',
    status: 'Verified',
    summary: 'Swept-source OCT optical biometry calculating axial length, anterior chamber depth, and Barrett Universal II IOL power.',
    clinicalNotes: 'Axial length OD: 23.82mm, OS: 23.86mm. Targeted for emmetropia with +21.5 D monofocal intraocular lens.',
    documentType: 'Biometry Calculation PDF',
    fileSize: '5.8 MB',
    ocrConfidence: 99.6,
  },
  {
    id: 'rec-10384',
    recordNumber: '#REC-10384',
    title: 'Visual Evoked Potential (VEP) Electrophysiology',
    patientName: 'Clara Higgins',
    patientInitials: 'CH',
    patientAvatarBg: '#9a4059',
    patientId: 'CID-4402-8819',
    category: 'Vision',
    recordType: 'Visual Field Test',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 06, 2026',
    recordDateIso: '2026-09-06',
    status: 'Verified',
    summary: 'Pattern-reversal visual evoked potential recording P100 peak wave latency from visual cortex.',
    clinicalNotes: 'P100 latency normal at 101 ms OU. Wave amplitudes robust and symmetrical. Optic nerve conduction healthy.',
    documentType: 'VEP Neuro Test PDF',
    fileSize: '3.3 MB',
    ocrConfidence: 98.9,
  },
  {
    id: 'rec-10381',
    recordNumber: '#REC-10381',
    title: 'Anterior Segment OCT Cornea-Iris Angle Scan',
    patientName: 'Robert J. Sterling',
    patientInitials: 'RS',
    patientAvatarBg: '#3f1d8b',
    patientId: 'CID-8472-9901',
    category: 'Vision',
    recordType: 'Ophthalmology Scan',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 04, 2026',
    recordDateIso: '2026-09-04',
    status: 'Verified',
    summary: 'High-speed anterior chamber tomographic profile measuring trabecular-iris angle space (TIA) and AOD500.',
    clinicalNotes: 'Angle opening distance AOD500: 420 µm. Open filtration pathway confirmed without iris plateau configuration.',
    documentType: 'Anterior OCT DICOM',
    fileSize: '18.4 MB',
    ocrConfidence: 99.4,
  },
  {
    id: 'rec-10378',
    recordNumber: '#REC-10378',
    title: 'Pediatric Strabismus & Binocular Vision Report',
    patientName: 'Leo Jenkins',
    patientInitials: 'LJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289-D1',
    isDependent: true,
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Sep 02, 2026',
    recordDateIso: '2026-09-02',
    status: 'Verified',
    summary: 'Cover-uncover and alternate prism cover testing at distance and near, stereopsis Titmus fly test.',
    clinicalNotes: 'Orthophoric at distance; 2 prism diopter exophoria at near (normal). Titmus stereopsis 40 seconds of arc (fine depth).',
    documentType: 'Pediatric Eye Report PDF',
    fileSize: '1.9 MB',
    ocrConfidence: 99.5,
  },
  {
    id: 'rec-10375',
    recordNumber: '#REC-10375',
    title: 'Scleral Specialty Contact Lens Dispensing',
    patientName: 'David K. Patel',
    patientInitials: 'DP',
    patientAvatarBg: '#28006d',
    patientId: 'CID-5512-3091',
    category: 'Vision',
    recordType: 'Vision Prescription',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Aug 30, 2026',
    recordDateIso: '2026-08-30',
    status: 'Verified',
    summary: 'Large-diameter gas permeable scleral lens delivery, apical fluid reservoir clearance measurement via OCT.',
    clinicalNotes: 'Central corneal clearance verified at 280 µm after 2 hours of settle. 20/20 visual acuity restored.',
    documentType: 'Specialty Lens RX PDF',
    fileSize: '3.7 MB',
    ocrConfidence: 99.1,
  },
  {
    id: 'rec-10372',
    recordNumber: '#REC-10372',
    title: 'Laser Peripheral Iridotomy Post-Op Review',
    patientName: 'Sarah Jenkins',
    patientInitials: 'SJ',
    patientAvatarBg: '#00696b',
    patientId: 'CID-9205-1289',
    category: 'Vision',
    recordType: 'Eye Health Record',
    provider: 'Dr. Elena Rostova',
    facility: 'Horizon Vision',
    recordDate: 'Aug 28, 2026',
    recordDateIso: '2026-08-28',
    status: 'Verified',
    summary: 'Nd:YAG laser peripheral iridotomy patency check, transillumination verification, and post-procedure pressure check.',
    clinicalNotes: 'Patent iridotomy opening confirmed at 11 o-clock position. Post-laser IOP 15 mmHg. Cornea completely quiet.',
    documentType: 'Laser Post-Op Report PDF',
    fileSize: '2.5 MB',
    ocrConfidence: 99.0,
  },
];

export async function fetchHealthRecords(params: FetchHealthRecordsParams = {}): Promise<HealthRecordsResult> {
  // Simulate quick asynchronous retrieval
  await new Promise((resolve) => setTimeout(resolve, 80));

  let filtered = [...healthRecordsStore];

  // Search filter across record titles, record numbers, resolved patient names, IDs, providers, and facilities
  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter((r) => {
      const pName = resolvePatientName(r).toLowerCase();
      const pId = (r.patientId || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const recNum = (r.recordNumber || '').toLowerCase();
      const provider = (r.provider || '').toLowerCase();
      const facility = (r.facility || '').toLowerCase();
      const recType = (r.recordType || '').toLowerCase();

      return (
        title.includes(q) ||
        recNum.includes(q) ||
        pName.includes(q) ||
        pId.includes(q) ||
        provider.includes(q) ||
        facility.includes(q) ||
        recType.includes(q)
      );
    });
  }

  // Category filter
  if (params.category && params.category !== 'All' && params.category !== 'All Records') {
    filtered = filtered.filter((r) => r.category.toLowerCase() === params.category!.toLowerCase());
  }

  // Patient filter
  if (params.patient && params.patient !== 'All' && params.patient !== 'All Patients') {
    filtered = filtered.filter(
      (r) => resolvePatientName(r).toLowerCase() === params.patient!.toLowerCase()
    );
  }

  // Provider filter
  if (params.provider && params.provider !== 'All' && params.provider !== 'All Providers') {
    filtered = filtered.filter((r) => r.provider.toLowerCase() === params.provider!.toLowerCase());
  }

  // Facility filter
  if (params.facility && params.facility !== 'All' && params.facility !== 'All Facilities') {
    filtered = filtered.filter((r) => r.facility.toLowerCase() === params.facility!.toLowerCase());
  }

  // Record Type filter
  if (params.recordType && params.recordType !== 'All' && !params.recordType.startsWith('All ')) {
    filtered = filtered.filter((r) => r.recordType.toLowerCase() === params.recordType!.toLowerCase());
  }

  // Status filter
  if (params.status && params.status !== 'All' && params.status !== 'All Statuses') {
    filtered = filtered.filter((r) => r.status.toLowerCase() === params.status!.toLowerCase());
  }

  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 10;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const paginatedRecords = filtered.slice(startIndex, startIndex + pageSize).map((r) => {
    const resolvedName = resolvePatientName(r);
    return {
      ...r,
      patientName: resolvedName,
      patientInitials: resolvePatientInitials(r, resolvedName),
      patientAvatarBg: resolvePatientAvatarBg(r, resolvedName),
    };
  });

  return {
    records: paginatedRecords,
    total,
    totalAll: 14820,
    totalMedical: 8940,
    totalDental: 3410,
    totalVision: 2470,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function fetchHealthRecordById(id?: string): Promise<HealthRecordItem | null> {
  if (!id) return null;
  await new Promise((resolve) => setTimeout(resolve, 60));
  const clean = id.toLowerCase().replace('#', '');
  const record = healthRecordsStore.find(
    (r) =>
      r.id === id ||
      r.recordNumber.toLowerCase() === id.toLowerCase() ||
      r.recordNumber.toLowerCase().replace('#', '') === clean ||
      (clean.includes('001234') && r.id === 'rec-10491')
  );
  if (!record) return null;
  const resolvedName = resolvePatientName(record);
  return {
    ...record,
    patientName: resolvedName,
    patientInitials: resolvePatientInitials(record, resolvedName),
    patientAvatarBg: resolvePatientAvatarBg(record, resolvedName),
  };
}

// React Query Hooks
export const useHealthRecordsQuery = (params: FetchHealthRecordsParams = {}) => {
  return useQuery({
    queryKey: ['healthRecords', params],
    queryFn: () => fetchHealthRecords(params),
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });
};

export const useHealthRecordQuery = (id?: string) => {
  return useQuery({
    queryKey: ['healthRecord', id],
    queryFn: () => fetchHealthRecordById(id),
    staleTime: 30000,
  });
};

export const useSyncHealthRecordsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return { success: true, timestamp: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
    },
  });
};

export const useUpdateHealthRecordStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      newStatus,
    }: {
      recordId: string;
      newStatus: HealthRecordStatus;
    }) => {
      await new Promise((r) => setTimeout(r, 200));
      healthRecordsStore = healthRecordsStore.map((r) =>
        r.id === recordId ? { ...r, status: newStatus } : r
      );
      return { recordId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
    },
  });
};

export async function fetchCategoryKpis(category: HealthRecordCategory): Promise<CategoryKpis> {
  await new Promise((resolve) => setTimeout(resolve, 60));

  switch (category) {
    case 'Medical':
      return {
        total: 8940,
        totalTrend: '+6.2%',
        totalSubtitle: 'vs last month',
        verified: 8412,
        verifiedRate: '94.1%',
        verifiedSubtitle: 'HIPAA & Clinical Compliance',
        pending: 386,
        pendingBadge: 'Requires Action',
        pendingSubtitle: 'Awaiting OCR / clinical signoff',
        processing: 142,
        processingBadge: 'Active Queue',
        processingSubtitle: 'Active pipeline ingestion',
      };
    case 'Dental':
      return {
        total: 3410,
        totalTrend: '+4.8%',
        totalSubtitle: 'vs last month',
        verified: 3184,
        verifiedRate: '93.4%',
        verifiedSubtitle: 'ADA & Clinical Compliance',
        pending: 154,
        pendingBadge: 'Requires Action',
        pendingSubtitle: 'Awaiting OCR / clinical signoff',
        processing: 72,
        processingBadge: 'Active Queue',
        processingSubtitle: 'Active pipeline ingestion',
      };
    case 'Vision':
      return {
        total: 2470,
        totalTrend: '+5.3%',
        totalSubtitle: 'vs last month',
        verified: 2318,
        verifiedRate: '93.8%',
        verifiedSubtitle: 'Clinical & Optometric Standard',
        pending: 108,
        pendingBadge: 'Requires Action',
        pendingSubtitle: 'Awaiting OCR / ophthalmologist signoff',
        processing: 44,
        processingBadge: 'Active Queue',
        processingSubtitle: 'Active pipeline ingestion',
      };
    default:
      return {
        total: 14820,
        totalTrend: '+5.4%',
        totalSubtitle: 'vs last month',
        verified: 13914,
        verifiedRate: '93.9%',
        verifiedSubtitle: 'Federated standard compliant',
        pending: 648,
        pendingBadge: 'Requires Action',
        pendingSubtitle: 'Awaiting clinical review',
        processing: 258,
        processingBadge: 'Active Queue',
        processingSubtitle: 'Active ingestion',
      };
  }
}

export const useCategoryHealthRecordKpisQuery = (category: HealthRecordCategory) => {
  return useQuery({
    queryKey: ['categoryHealthRecordKpis', category],
    queryFn: () => fetchCategoryKpis(category),
    staleTime: 60000,
  });
};

// Archived records store initialized with authentic items from Figma dialogs
let archivedRecordsStore: ArchivedRecordItem[] = [
  {
    id: 'arch-1',
    recordNumber: '#REC-8849',
    fileName: 'Consultation_Notes_Nov2023.docx',
    patientId: 'CID-4421-9011',
    patientName: 'Marcus Vance',
    category: 'Medical',
    archivedDate: '12 Nov 2023',
    fileSize: '1.4 MB',
  },
  {
    id: 'arch-2',
    recordNumber: '#REC-7712',
    fileName: 'Patient_File_12B.pdf',
    patientId: 'CID-8849-1022',
    patientName: 'David K. Patel',
    category: 'Dental',
    archivedDate: '04 Oct 2026',
    fileSize: '4.8 MB',
  },
];

export async function fetchRecordAuditTrail(recordId?: string): Promise<AuditTrailEvent[]> {
  if (!recordId) return [];
  await new Promise((r) => setTimeout(r, 60));

  const cleanId = recordId.toLowerCase().replace('#', '');
  const record = healthRecordsStore.find(
    (r) =>
      r.id === recordId ||
      r.recordNumber.toLowerCase() === recordId.toLowerCase() ||
      r.recordNumber.toLowerCase().replace('#', '') === cleanId ||
      (cleanId.includes('001234') && r.id === 'rec-10491')
  );

  if (!record) {
    return [];
  }

  // If this matches Sarah Jenkins' Dental OPG scan, return authentic ledger events from Figma 20:18361
  if (
    record.id === 'rec-10491' ||
    record.patientId === 'CID-9205-1289' ||
    cleanId.includes('10491') ||
    cleanId.includes('001234')
  ) {
    return [
      {
        id: 'audit-1',
        recordId: record.id,
        action: 'Downloaded Original DICOM',
        actor: 'Dr. Michael Chen',
        actorRole: 'IP: 198.51.100.24 • Authorized',
        timestamp: 'Today, 10:45 AM',
        timestampRelative: 'Today, 10:45 AM',
        status: 'verified',
        ipAddress: '198.51.100.24',
        details: 'High-resolution DICOM asset export by attending specialist.',
        hash: '0x8f4e92a1c6e43...39b',
      },
      {
        id: 'audit-2',
        recordId: record.id,
        action: 'Clinical Verification Signoff',
        actor: 'Dr. Aris Evans',
        actorRole: 'Chief of Oral Radiology',
        timestamp: 'Today, 09:38 AM',
        timestampRelative: 'Today, 09:38 AM',
        status: 'verified',
        details: 'Diagnostic signoff confirmed with anatomical markers verified.',
        hash: '0x7c21f90ab128...88c',
      },
      {
        id: 'audit-3',
        recordId: record.id,
        action: 'Automated OCR Extraction Completed',
        actor: 'Care ID Neural Engine',
        actorRole: '100% Schema Match',
        timestamp: 'Today, 09:16 AM',
        timestampRelative: 'Today, 09:16 AM',
        status: 'success',
        details: 'Neural OCR extraction completed with 99.4% biometric confidence.',
        hash: '0x4e921bc678de...51a',
      },
      {
        id: 'audit-4',
        recordId: record.id,
        action: 'Record Uploaded via Gateway',
        actor: record.facility || 'Apex Dental Care Center',
        actorRole: 'Encrypted API payload',
        timestamp: 'Today, 09:14 AM',
        timestampRelative: 'Today, 09:14 AM',
        status: 'info',
        details: 'Ingested via Care ID Federated Gateway with AES-256-GCM encryption.',
        hash: '0x18a9fc438e11...29d',
      },
    ];
  }

  // Generate authentic chronological ledger entries for any other record in store
  const providerName = record.provider || 'Dr. Julian Vance';
  const facilityName = record.facility || 'Metro Hospital';
  const recDate = record.recordDate || 'Oct 24, 2026';

  return [
    {
      id: `audit-${record.id}-1`,
      recordId: record.id,
      action: 'Viewed and Inspected Document',
      actor: providerName,
      actorRole: 'Clinical Specialist • Authorized',
      timestamp: `${recDate} 11:20 AM`,
      timestampRelative: '11:20 AM',
      status: 'verified',
      ipAddress: '198.51.100.42',
      details: 'Audit verification event recorded in Care ID immutable ledger.',
      hash: '0x7a31b99f...81c',
    },
    {
      id: `audit-${record.id}-2`,
      recordId: record.id,
      action: record.status === 'Verified' ? 'Clinical Verification Signoff' : 'Verification Review Pending',
      actor: providerName,
      actorRole: 'Attending Staff',
      timestamp: `${recDate} 10:05 AM`,
      timestampRelative: '10:05 AM',
      status: record.status === 'Verified' ? 'verified' : 'info',
      details: record.status === 'Verified' ? 'Attending clinical review confirmed.' : 'Pending primary reviewer signoff.',
      hash: '0x5b18cf42...99e',
    },
    {
      id: `audit-${record.id}-3`,
      recordId: record.id,
      action: 'Automated OCR Extraction Completed',
      actor: 'Care ID Neural Engine (v4.2)',
      actorRole: `${record.ocrConfidence || 98}% Confidence Match`,
      timestamp: `${recDate} 09:30 AM`,
      timestampRelative: '09:30 AM',
      status: 'success',
      details: 'Automated clinical payload parsing and schema alignment complete.',
      hash: '0x32e911da...40b',
    },
    {
      id: `audit-${record.id}-4`,
      recordId: record.id,
      action: 'Record Uploaded via Gateway',
      actor: facilityName,
      actorRole: 'Encrypted API payload',
      timestamp: `${recDate} 09:15 AM`,
      timestampRelative: '09:15 AM',
      status: 'info',
      details: 'Payload encrypted and stored in Care ID federated repository.',
      hash: '0x19df77cb...12a',
    },
  ];
}

export const useRecordAuditTrailQuery = (recordId?: string) => {
  return useQuery({
    queryKey: ['recordAuditTrail', recordId],
    queryFn: () => fetchRecordAuditTrail(recordId),
    enabled: Boolean(recordId),
    staleTime: 30000,
  });
};

export const useArchivedRecordsQuery = () => {
  return useQuery({
    queryKey: ['archivedRecords'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 60));
      return [...archivedRecordsStore];
    },
    staleTime: 30000,
  });
};

export const useUploadHealthRecordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UploadRecordPayload) => {
      await new Promise((r) => setTimeout(r, 600));

      const num = Math.floor(10000 + Math.random() * 90000);
      const newId = `rec-${num}`;
      const recordNumber = `#REC-${num}`;
      const resolvedName = payload.patientName || resolvePatientName({ patientId: payload.patientId });

      const newRecord: HealthRecordItem = {
        id: newId,
        recordNumber,
        title: payload.recordType || 'Diagnostic Record',
        patientName: resolvedName,
        patientInitials: resolvePatientInitials(null, resolvedName),
        patientAvatarBg: resolvePatientAvatarBg(null, resolvedName),
        patientId: payload.patientId,
        category: payload.category,
        recordType: payload.recordType,
        provider: payload.provider,
        facility: payload.facility,
        recordDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        recordDateIso: new Date().toISOString(),
        status: 'Pending Verification',
        summary: payload.summary,
        clinicalNotes: payload.clinicalNotes || 'Initial payload uploaded and indexed into CareID repository.',
        documentType: payload.file && 'type' in payload.file && payload.file.type.includes('pdf') ? 'PDF' : 'DICOM / PDF',
        fileSize: payload.file && 'size' in payload.file ? `${(payload.file.size / (1024 * 1024)).toFixed(1)} MB` : '12.4 MB',
        ocrConfidence: 96.5,
      };

      healthRecordsStore = [newRecord, ...healthRecordsStore];
      return newRecord;
    },
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
      queryClient.setQueryData(['healthRecord', newRecord.id], newRecord);
    },
  });
};

export const useArchiveHealthRecordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, fileName }: { recordId: string; fileName?: string }) => {
      await new Promise((r) => setTimeout(r, 450));
      const target = healthRecordsStore.find((r) => r.id === recordId);
      if (target) {
        archivedRecordsStore = [
          {
            id: `arch-${Date.now()}`,
            recordNumber: target.recordNumber,
            fileName: fileName || `${target.title.replace(/\s+/g, '_')}.pdf`,
            patientId: target.patientId,
            patientName: resolvePatientName(target),
            category: target.category,
            archivedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            fileSize: target.fileSize || '3.2 MB',
          },
          ...archivedRecordsStore,
        ];
        healthRecordsStore = healthRecordsStore.filter((r) => r.id !== recordId);
      }
      return { recordId, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
      queryClient.invalidateQueries({ queryKey: ['archivedRecords'] });
    },
  });
};

export const useRestoreHealthRecordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ archiveId }: { archiveId: string }) => {
      await new Promise((r) => setTimeout(r, 450));
      const target = archivedRecordsStore.find((a) => a.id === archiveId);
      if (target) {
        const restoredRecord: HealthRecordItem = {
          id: `rec-${Date.now()}`,
          recordNumber: target.recordNumber,
          title: target.fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          patientName: target.patientName,
          patientInitials: resolvePatientInitials(null, target.patientName),
          patientAvatarBg: resolvePatientAvatarBg(null, target.patientName),
          patientId: target.patientId,
          category: target.category,
          recordType: 'Restored Clinical Record',
          provider: 'Dr. Michael Chen',
          facility: 'Apex Dental Care Center',
          recordDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          recordDateIso: new Date().toISOString(),
          status: 'Verified',
          summary: `Restored record ${target.fileName} from CareID Archive Vault. Re-indexed for patient ${target.patientId}.`,
          documentType: target.fileName.endsWith('.docx') ? 'DOCX Document' : 'PDF Document',
          fileSize: target.fileSize,
          ocrConfidence: 99.0,
        };
        healthRecordsStore = [restoredRecord, ...healthRecordsStore];
        archivedRecordsStore = archivedRecordsStore.filter((a) => a.id !== archiveId);
        return restoredRecord;
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
      queryClient.invalidateQueries({ queryKey: ['archivedRecords'] });
    },
  });
};

export const useRerunOcrMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      await new Promise((r) => setTimeout(r, 500));
      healthRecordsStore = healthRecordsStore.map((r) =>
        r.id === recordId ? { ...r, ocrConfidence: 99.8, status: 'Verified' } : r
      );
      return { recordId, success: true, newConfidence: 99.8 };
    },
    onSuccess: (_, recordId) => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
      queryClient.invalidateQueries({ queryKey: ['healthRecord', recordId] });
      queryClient.invalidateQueries({ queryKey: ['recordAuditTrail', recordId] });
    },
  });
};

export const useFlagRecordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, reason }: { recordId: string; reason: string }) => {
      await new Promise((r) => setTimeout(r, 400));
      healthRecordsStore = healthRecordsStore.map((r) =>
        r.id === recordId
          ? { ...r, status: 'Pending Verification', clinicalNotes: `Flagged for clarification: ${reason}` }
          : r
      );
      return { recordId, reason, success: true };
    },
    onSuccess: (_, { recordId }) => {
      queryClient.invalidateQueries({ queryKey: ['healthRecords'] });
      queryClient.invalidateQueries({ queryKey: ['healthRecord', recordId] });
      queryClient.invalidateQueries({ queryKey: ['recordAuditTrail', recordId] });
    },
  });
};
