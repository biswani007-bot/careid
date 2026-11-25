/**
 * CareID Doctor Web - Medical Record Unified CSV Exporter
 * 
 * Generates an RFC 4180-compliant, Excel- and Google Sheets-compatible CSV export
 * of a patient's complete longitudinal medical history.
 * 
 * Features:
 * - UTF-8 Byte Order Mark (\uFEFF) for native Excel UTF-8 recognition
 * - Strict RFC 4180 escaping (commas, quotes, multiline clinical notes)
 * - Anti-formula injection mitigation for =, +, -, @ prefixes
 * - Full detail preservation: nested records preserved as valid JSON in "Details" column
 */

export const CSV_RECORD_COLUMNS = [
  'Patient ID',
  'Patient Name',
  'Record Category',
  'Record ID',
  'Record Title',
  'Date',
  'Status',
  'Doctor',
  'Facility',
  'Medication',
  'Dosage',
  'Frequency',
  'Duration',
  'Diagnosis',
  'Clinical Notes',
  'Details',
  'Attachment URL',
] as const;

export type CsvRecordColumn = typeof CSV_RECORD_COLUMNS[number];

export interface UnifiedExportPatient {
  id?: string;
  patientNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  address?: Record<string, unknown> | string;
  [key: string]: unknown;
}

export interface UnifiedExportClinician {
  id?: string;
  fullName?: string;
  specialization?: string;
  [key: string]: unknown;
}

export interface UnifiedExportMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  route?: string;
  quantity?: number | string;
}

export interface UnifiedExportPrescription {
  id: string;
  patientProfileId?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  reportDate?: string;
  prescribedBy?: string;
  doctorName?: string;
  providerName?: string;
  facilityName?: string;
  medications?: UnifiedExportMedication[];
  tags?: string[];
  notes?: string;
  refillCount?: number;
  maxRefills?: number | null;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  attachments?: Array<{ storageUrl?: string; [key: string]: unknown }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface UnifiedExportMedicalRecord {
  id: string;
  title?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  treatmentPlan?: string;
  status?: string;
  providerName?: string;
  facilityName?: string;
  diagnoses?: Array<{
    id?: string;
    code?: string;
    description: string;
    type?: string;
    status?: string;
    createdAt?: string;
  }>;
  encounters?: Array<{
    id?: string;
    providerName?: string;
    facilityName?: string;
    encounterDate?: string;
    encounterType?: string;
    notes?: string;
    [key: string]: unknown;
  }>;
  vitalSigns?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface UnifiedExportAdmission {
  id: string;
  title?: string;
  encounterDate?: string;
  admissionDate?: string;
  dischargeDate?: string;
  facilityName?: string;
  providerName?: string;
  attendingDoctorName?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  status?: string;
  ward?: string;
  roomBed?: string;
  admissionType?: string;
  diagnoses?: Array<{ description: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface UnifiedExportTimelineItem {
  id: string;
  type?: string;
  title?: string;
  date?: string;
  category?: string;
  status?: string;
  summary?: string;
  details?: {
    originalName?: string;
    fileSize?: number;
    mimeType?: string;
    storageUrl?: string;
    url?: string;
    virusScanStatus?: string;
    category?: string;
    uploadedBy?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UnifiedExportData {
  exportedAt?: string;
  patient?: UnifiedExportPatient;
  clinician?: UnifiedExportClinician;
  prescriptions?: UnifiedExportPrescription[];
  medicalRecords?: UnifiedExportMedicalRecord[];
  timeline?: UnifiedExportTimelineItem[];
  admissions?: UnifiedExportAdmission[];
  vitals?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ConvertCsvResult {
  csvContent: string;
  filename: string;
  totalRows: number;
  categoryCounts: Record<string, number>;
  blob: Blob;
}

/**
 * Escapes a cell value conforming to RFC 4180 and protects against spreadsheet formula injection.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();

  // Protect against spreadsheet formula injection for untrusted text
  if (/^[=+\-@]/.test(str)) {
    // If not a plain signed number (e.g. -5, +10), prefix with single quote
    if (isNaN(Number(str))) {
      str = `'${str}`;
    }
  }

  // If the cell contains quotes, commas, or line breaks, enclose in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Normalizes and converts complete unified patient JSON into an RFC 4180 CSV
 */
export function convertUnifiedJsonToCsv(
  rawExport: UnifiedExportData | { data: UnifiedExportData },
  fallbackPatientName = ''
): ConvertCsvResult {
  const data: UnifiedExportData = (rawExport as { data?: UnifiedExportData })?.data || rawExport;

  const patient = data.patient || {};
  const patientId = String(patient.id || '').trim();
  const patientName = patient.fullName?.trim() || fallbackPatientName || 'CareID Patient';
  const clinicianName = data.clinician?.fullName || '';

  const rows: string[] = [];
  const categoryCounts: Record<string, number> = {};

  const addRow = (record: Partial<Record<CsvRecordColumn, unknown>>) => {
    const category = String(record['Record Category'] || 'OTHER');
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    const line = CSV_RECORD_COLUMNS.map((col) => escapeCsvCell(record[col])).join(',');
    rows.push(line);
  };

  // 1. DEMOGRAPHICS
  if (data.patient) {
    const p = data.patient;
    const contactParts: string[] = [];
    if (p.phone) contactParts.push(`Phone: ${p.phone}`);
    if (p.email) contactParts.push(`Email: ${p.email}`);
    if (p.gender) contactParts.push(`Gender: ${p.gender}`);
    if (p.bloodGroup) contactParts.push(`Blood Group: ${p.bloodGroup}`);
    if (p.dateOfBirth) contactParts.push(`DOB: ${p.dateOfBirth}`);

    addRow({
      'Patient ID': patientId,
      'Patient Name': patientName,
      'Record Category': 'DEMOGRAPHICS',
      'Record ID': p.patientNumber || p.id || '',
      'Record Title': 'Patient Demographics & Registration Profile',
      'Date': p.dateOfBirth || data.exportedAt || '',
      'Status': 'ACTIVE',
      'Doctor': clinicianName,
      'Facility': 'CareID Health Network',
      'Medication': '',
      'Dosage': '',
      'Frequency': '',
      'Duration': '',
      'Diagnosis': p.bloodGroup ? `Blood Group: ${p.bloodGroup}` : '',
      'Clinical Notes': contactParts.join(' | '),
      'Details': JSON.stringify(p),
      'Attachment URL': '',
    });
  }

  // 2. PRESCRIPTIONS
  if (Array.isArray(data.prescriptions)) {
    for (const rx of data.prescriptions) {
      const prescriber = rx.prescribedBy || rx.doctorName || clinicianName;
      const medications =
        Array.isArray(rx.medications) && rx.medications.length > 0 ? rx.medications : [null];

      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        const rowId = rx.id ? (medications.length > 1 ? `${rx.id}-MED-${i + 1}` : rx.id) : '';

        addRow({
          'Patient ID': patientId,
          'Patient Name': patientName,
          'Record Category': 'PRESCRIPTION',
          'Record ID': rowId,
          'Record Title': rx.title || 'Medication Prescription',
          'Date': rx.reportDate || rx.createdAt || '',
          'Status': rx.status || 'ACTIVE',
          'Doctor': prescriber,
          'Facility': rx.facilityName || 'CareID Heart Institute',
          'Medication': med ? med.name : rx.title || '',
          'Dosage': med?.dosage || '—',
          'Frequency': med?.frequency || 'As directed',
          'Duration': med?.duration || '—',
          'Diagnosis': rx.diagnosis || (Array.isArray(rx.tags) ? rx.tags.join('; ') : ''),
          'Clinical Notes': rx.notes || med?.instructions || rx.description || '',
          'Details': JSON.stringify({
            refillCount: rx.refillCount,
            maxRefills: rx.maxRefills,
            verificationStatus: rx.verificationStatus,
            verifiedBy: rx.verifiedBy,
            verifiedAt: rx.verifiedAt,
            tags: rx.tags,
            description: rx.description,
            route: med?.route,
            quantity: med?.quantity,
          }),
          'Attachment URL':
            Array.isArray(rx.attachments) && rx.attachments.length > 0
              ? rx.attachments[0].storageUrl || ''
              : '',
        });
      }
    }
  }

  // 3. MEDICAL RECORDS & CLINICAL ENCOUNTER SOAP NOTES
  if (Array.isArray(data.medicalRecords)) {
    for (const mr of data.medicalRecords) {
      const diagnosesStr = Array.isArray(mr.diagnoses)
        ? mr.diagnoses
            .map((d) => `${d.code ? `[${d.code}] ` : ''}${d.description}`)
            .filter(Boolean)
            .join('; ')
        : '';

      const soapParts: string[] = [];
      if (mr.chiefComplaint) soapParts.push(`Subjective (Chief Complaint): ${mr.chiefComplaint}`);
      if (mr.clinicalNotes) soapParts.push(`Objective (Clinical Notes): ${mr.clinicalNotes}`);
      if (diagnosesStr) soapParts.push(`Assessment (Diagnosis): ${diagnosesStr}`);
      if (mr.treatmentPlan) soapParts.push(`Plan (Treatment Plan): ${mr.treatmentPlan}`);

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': 'MEDICAL_RECORD',
        'Record ID': mr.id || '',
        'Record Title': mr.title || 'Clinical Medical Record',
        'Date': mr.createdAt || mr.updatedAt || '',
        'Status': mr.status || 'FINAL',
        'Doctor': mr.providerName || clinicianName,
        'Facility': mr.facilityName || 'CareID Health Center',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': '',
        'Diagnosis': diagnosesStr,
        'Clinical Notes': soapParts.join('\n\n'),
        'Details': JSON.stringify({
          chiefComplaint: mr.chiefComplaint,
          clinicalNotes: mr.clinicalNotes,
          treatmentPlan: mr.treatmentPlan,
          diagnoses: mr.diagnoses,
          encounters: mr.encounters,
          vitalSigns: mr.vitalSigns,
        }),
        'Attachment URL': '',
      });
    }
  }

  // 4. HOSPITAL ADMISSIONS
  if (Array.isArray(data.admissions)) {
    for (const adm of data.admissions) {
      const diagStr = Array.isArray(adm.diagnoses)
        ? adm.diagnoses.map((d) => d.description).filter(Boolean).join('; ')
        : '';

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': 'ADMISSION',
        'Record ID': adm.id || '',
        'Record Title': adm.title || 'Inpatient Hospital Admission',
        'Date': adm.encounterDate || adm.admissionDate || '',
        'Status': adm.status || 'FINAL',
        'Doctor': adm.providerName || adm.attendingDoctorName || clinicianName,
        'Facility': adm.facilityName || 'CareID Heart Institute',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': adm.dischargeDate ? `${adm.encounterDate || ''} to ${adm.dischargeDate}` : '—',
        'Diagnosis': diagStr,
        'Clinical Notes': adm.chiefComplaint || adm.clinicalNotes || '',
        'Details': JSON.stringify(adm),
        'Attachment URL': '',
      });
    }
  }

  // 5. TIMELINE EVENTS & ATTACHMENTS
  if (Array.isArray(data.timeline)) {
    for (const item of data.timeline) {
      const isAttachment = item.type === 'ATTACHMENT';
      const category = isAttachment ? 'ATTACHMENT' : item.type || 'ENCOUNTER';

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': category,
        'Record ID': item.id || '',
        'Record Title': item.details?.originalName || item.title || 'Timeline Item',
        'Date': item.date || '',
        'Status': item.status || item.details?.virusScanStatus || 'COMPLETED',
        'Doctor': clinicianName,
        'Facility': '',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': '',
        'Diagnosis': item.category || '',
        'Clinical Notes': item.summary || item.details?.originalName || '',
        'Details': JSON.stringify(item.details || {}),
        'Attachment URL': item.details?.storageUrl || item.details?.url || '',
      });
    }
  }

  // 6. VITALS (if explicitly returned in top-level vitals or patient vitals)
  if (Array.isArray(data.vitals) && data.vitals.length > 0) {
    for (let idx = 0; idx < data.vitals.length; idx++) {
      const v = data.vitals[idx];
      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': 'VITAL',
        'Record ID': String(v.id || `vital-${idx + 1}`),
        'Record Title': 'Patient Vital Signs Measurement',
        'Date': String(v.measuredAt || v.recordedAt || v.createdAt || ''),
        'Status': 'RECORDED',
        'Doctor': String(v.recordedBy || clinicianName),
        'Facility': 'CareID Clinical Telemetry',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': '',
        'Diagnosis': '',
        'Clinical Notes': [
          v.systolicBp && v.diastolicBp ? `BP: ${v.systolicBp}/${v.diastolicBp} mmHg` : '',
          v.pulseBpm ? `Heart Rate: ${v.pulseBpm} bpm` : '',
          v.spo2Percent ? `SpO2: ${v.spo2Percent}%` : '',
          v.temperatureC ? `Temp: ${v.temperatureC} °C` : '',
          v.weightKg ? `Weight: ${v.weightKg} kg` : '',
          v.bmi ? `BMI: ${v.bmi}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        'Details': JSON.stringify(v),
        'Attachment URL': '',
      });
    }
  }

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [CSV_RECORD_COLUMNS.join(','), ...rows].join('\r\n');

  // Sanitize filename for filesystem compatibility
  const sanitizedId = (patientId || 'patient').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
  const filename = `careid-full-medical-record-${sanitizedId}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

  return {
    csvContent,
    filename,
    totalRows: rows.length,
    categoryCounts,
    blob,
  };
}

