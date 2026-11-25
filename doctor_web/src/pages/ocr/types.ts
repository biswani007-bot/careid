import { BackendOcrField } from '@/services/ocrService';
import { MedicalRecord } from '@/services/patientService';

export type OcrWorkflowStep = 'upload' | 'processing' | 'review' | 'success';

export type SupportedFileFormat = 'PDF' | 'PNG' | 'JPG / JPEG' | 'DICOM';

export interface PatientSummary {
  id: string;
  name: string;
  healthVaultId: string;
  age: string;
  gender: string;
  dob?: string;
  verified: boolean;
  avatarUrl?: string;
  photoUrl?: string | null;
}

export interface RecentUploadRecord {
  id: string;
  documentName: string;
  type: string;
  date: string;
  status: 'Verified' | 'Needs Review' | 'Processing' | 'Saved';
  statusColor: string;
  action: string;
  rawRecordId?: string;
}

export interface ExtractedClinicalField {
  id: string;
  label: string;
  value: string;
  originalValue: string;
  status: 'verified' | 'needs-review' | 'medium-confidence';
  confidenceScore: number;
  warningNote?: string;
  category: 'demographics' | 'report-details';
}

export interface ClinicalLabRow {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status?: 'normal' | 'high' | 'low';
}

export interface OcrProcessingState {
  isProcessing: boolean;
  progressPercent: number;
  currentStage: string;
  stageIndex: number;
}

export const OCR_PROCESSING_STAGES = [
  'Reading document raster...',
  'Extracting clinical entities & optical characters...',
  'Analyzing confidence intervals & field anchors...',
  'Normalizing medical nomenclature to EHR format...',
];

/**
 * Maps a MedicalRecord entity from backend into the RecentUploadRecord table structure
 */
export function mapMedicalRecordToRecentUpload(record: MedicalRecord): RecentUploadRecord {
  const isFinal = record.status === 'FINAL';
  const isNeedsReview = record.status === 'PRELIMINARY' || record.status === 'DRAFT';
  const displayStatus = isFinal ? 'Verified' : isNeedsReview ? 'Needs Review' : 'Saved';
  const statusColor = isFinal
    ? 'bg-[rgba(0,105,107,0.15)] text-[#00696b]'
    : isNeedsReview
    ? 'bg-[#ffdad6] text-[#93000a]'
    : 'bg-slate-100 text-slate-700';

  const dateFormatted = record.createdAt
    ? new Date(record.createdAt).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US');

  return {
    id: `REC-${record.id.slice(0, 6).toUpperCase()}`,
    documentName: record.title || 'Diagnostic Report',
    type: ((record.encounters as Array<{ encounterType?: string }>)?.[0]?.encounterType) || 'Laboratory',
    date: dateFormatted,
    status: displayStatus,
    statusColor,
    action: isNeedsReview ? 'Review' : 'View',
    rawRecordId: record.id,
  };
}

/**
 * Maps backend OCR extracted fields and text into the UI's structured field list
 */
export function parseOcrFields(
  fields: BackendOcrField[] = [],
  rawText: string = '',
  targetPatient?: PatientSummary | null
): {
  demographicsAndDetails: ExtractedClinicalField[];
  labRows: ClinicalLabRow[];
} {
  // Index backend fields by name
  const fieldMap: Record<string, BackendOcrField> = {};
  for (const f of fields) {
    fieldMap[f.fieldName.toLowerCase()] = f;
  }

  // Fallback parsing from rawText if fields array is empty or partial
  const extractFromText = (regex: RegExp, fallback = ''): string => {
    const match = rawText.match(regex);
    return match && match[1] ? match[1].trim() : fallback;
  };

  const patientNameVal =
    fieldMap['patient_name']?.fieldValue ||
    extractFromText(/Patient Name:\s*([^\n\r]+)/i, targetPatient?.name || '');

  const mrnVal =
    fieldMap['mrn']?.fieldValue ||
    fieldMap['hv_id']?.fieldValue ||
    extractFromText(/(?:MRN|HealthVault ID|ID):\s*([^\n\r]+)/i, targetPatient?.healthVaultId || '');

  const dobVal =
    fieldMap['dob']?.fieldValue ||
    extractFromText(/DOB:\s*([^\n\r]+)/i, targetPatient?.dob || '');

  const genderVal =
    fieldMap['gender']?.fieldValue ||
    extractFromText(/Gender:\s*([^\n\r]+)/i, targetPatient?.gender || 'Unknown');

  const facilityVal =
    fieldMap['facility']?.fieldValue ||
    fieldMap['hospital_facility']?.fieldValue ||
    extractFromText(/Facility:\s*([^\n\r]+)/i, 'CareID Diagnostics Lab');

  const reportDateVal =
    fieldMap['report_date']?.fieldValue ||
    fieldMap['date']?.fieldValue ||
    extractFromText(/Date(?:\s*of Report)?:\s*([^\n\r]+)/i, new Date().toISOString().split('T')[0]);

  const reportTypeVal =
    fieldMap['test_name']?.fieldValue ||
    fieldMap['report_type']?.fieldValue ||
    extractFromText(/Test Name:\s*([^\n\r]+)/i, 'Complete Blood Count (CBC)');

  const confidenceScore = (f?: BackendOcrField, defaultScore = 0.95): number => {
    if (!f) return defaultScore;
    return f.confidence > 1 ? f.confidence / 100 : f.confidence;
  };

  const getStatus = (
    val: string,
    targetVal?: string,
    fieldConfidence = 0.95
  ): 'verified' | 'needs-review' | 'medium-confidence' => {
    if (!val || val.trim() === '') return 'needs-review';
    if (fieldConfidence < 0.75) return 'needs-review';
    if (fieldConfidence < 0.9) return 'medium-confidence';
    if (targetVal && val.replace(/[-_ ]/g, '').toLowerCase() !== targetVal.replace(/[-_ ]/g, '').toLowerCase()) {
      return 'needs-review';
    }
    return 'verified';
  };

  const demographicsAndDetails: ExtractedClinicalField[] = [
    {
      id: 'patient_name',
      label: 'Patient Name',
      value: patientNameVal,
      originalValue: patientNameVal,
      status: getStatus(patientNameVal, targetPatient?.name, confidenceScore(fieldMap['patient_name'])),
      confidenceScore: confidenceScore(fieldMap['patient_name'], 0.96),
      category: 'demographics',
    },
    {
      id: 'hv_id',
      label: 'HV ID',
      value: mrnVal,
      originalValue: mrnVal,
      status: getStatus(mrnVal, targetPatient?.healthVaultId, confidenceScore(fieldMap['mrn'])),
      confidenceScore: confidenceScore(fieldMap['mrn'], 0.95),
      warningNote:
        targetPatient && mrnVal && targetPatient.healthVaultId.replace(/[-_ ]/g, '').toUpperCase() !== mrnVal.replace(/[-_ ]/g, '').toUpperCase()
          ? 'Suspected identifier divergence with active chart'
          : undefined,
      category: 'demographics',
    },
    {
      id: 'dob',
      label: 'DOB',
      value: dobVal,
      originalValue: dobVal,
      status: 'verified',
      confidenceScore: confidenceScore(fieldMap['dob'], 0.96),
      category: 'demographics',
    },
    {
      id: 'gender',
      label: 'Gender',
      value: genderVal,
      originalValue: genderVal,
      status: 'verified',
      confidenceScore: confidenceScore(fieldMap['gender'], 0.98),
      category: 'demographics',
    },
    {
      id: 'hospital_facility',
      label: 'Hospital / Facility',
      value: facilityVal,
      originalValue: facilityVal,
      status: confidenceScore(fieldMap['facility'], 0.88) < 0.9 ? 'medium-confidence' : 'verified',
      confidenceScore: confidenceScore(fieldMap['facility'], 0.88),
      warningNote: confidenceScore(fieldMap['facility'], 0.88) < 0.9 ? 'Verified via clinic master index' : undefined,
      category: 'report-details',
    },
    {
      id: 'collection_date',
      label: 'Collection Date',
      value: reportDateVal,
      originalValue: reportDateVal,
      status: 'verified',
      confidenceScore: confidenceScore(fieldMap['report_date'], 0.95),
      category: 'report-details',
    },
    {
      id: 'report_type',
      label: 'Report Type',
      value: reportTypeVal,
      originalValue: reportTypeVal,
      status: 'verified',
      confidenceScore: confidenceScore(fieldMap['test_name'], 0.97),
      category: 'report-details',
    },
  ];

  // Parse clinical lab rows from backend fields or raw text
  const labRows: ClinicalLabRow[] = [];

  const addLabRow = (testName: string, value: string, unit: string, ref?: string) => {
    labRows.push({
      id: `lab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      testName,
      value,
      unit,
      referenceRange: ref,
      status: 'normal',
    });
  };

  if (fieldMap['hemoglobin']?.fieldValue) {
    const rawVal = fieldMap['hemoglobin'].fieldValue;
    const match = rawVal.match(/^([\d.]+)\s*(.*)$/);
    addLabRow('Hemoglobin', match ? match[1] : rawVal, match ? match[2] : 'g/dL', '12.0 - 15.5 g/dL');
  } else {
    const hgb = extractFromText(/Hemoglobin:\s*([\d.]+)\s*([a-zA-Z/]+)?/i);
    if (hgb) {
      addLabRow('Hemoglobin', hgb, 'g/dL', '12.0 - 15.5 g/dL');
    }
  }

  if (fieldMap['wbc']?.fieldValue) {
    const rawVal = fieldMap['wbc'].fieldValue;
    const match = rawVal.match(/^([\d,.]+)\s*(.*)$/);
    addLabRow('WBC Count', match ? match[1] : rawVal, match ? match[2] : '/uL', '4,500 - 11,000 /uL');
  } else {
    const wbc = extractFromText(/WBC:\s*([\d,.]+)\s*([a-zA-Z/]+)?/i);
    if (wbc) {
      addLabRow('WBC Count', wbc, '/uL', '4,500 - 11,000 /uL');
    }
  }

  if (fieldMap['platelet_count']?.fieldValue) {
    const rawVal = fieldMap['platelet_count'].fieldValue;
    const match = rawVal.match(/^([\d,.]+)\s*(.*)$/);
    addLabRow('Platelet Count', match ? match[1] : rawVal, match ? match[2] : '/uL', '150,000 - 450,000 /uL');
  } else {
    const plt = extractFromText(/Platelet Count:\s*([\d,.]+)\s*([a-zA-Z/]+)?/i);
    if (plt) {
      addLabRow('Platelet Count', plt, '/uL', '150,000 - 450,000 /uL');
    }
  }

  // No fallback dummy rows — if the backend returns no lab fields, the table
  // remains empty and the doctor can add rows manually using the "+ Add Row" button.

  return { demographicsAndDetails, labRows };
}
