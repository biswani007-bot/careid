/**
 * CareID E2E Test Suite - Test Fixtures & Synthetic Payloads
 * Provides valid/invalid binaries, medical document templates, and clinical datasets.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Generate a valid minimal PDF buffer conforming to PDF-1.4 spec
 */
export function createValidPdfBuffer(pageCount: number = 1, textContent: string = 'CareID Medical Report'): Buffer {
  let objects = '';
  const offsets: number[] = [];

  const addObj = (id: number, content: string) => {
    offsets[id] = 9 + objects.length;
    objects += `${id} 0 obj\n${content}\nendobj\n`;
  };

  // Obj 1: Catalog
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // Obj 2: Pages
  const pageRefs = Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(' ');
  addObj(2, `<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`);

  // Page Objs
  const streamObjId = 3 + pageCount;
  for (let i = 0; i < pageCount; i++) {
    addObj(3 + i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${streamObjId} 0 R >>`);
  }

  // Content Stream Obj
  const streamData = `BT /F1 12 Tf 72 712 Td (${textContent.replace(/[()]/g, '')}) Tj ET`;
  addObj(streamObjId, `<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream`);

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const startXref = header.length + objects.length;
  const trailer = `trailer\n<< /Size ${streamObjId + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(header + objects + trailer, 'latin1');
}

/**
 * Generate a valid minimal 1x1 PNG image buffer
 */
export function createValidPngBuffer(): Buffer {
  const localSamplePath = path.resolve(process.cwd(), 'src/assets/medical/scanned-lab-report.png');
  if (fs.existsSync(localSamplePath)) {
    return fs.readFileSync(localSamplePath);
  }
  // Fallback 1x1 base64 PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
}

/**
 * Generate a valid minimal JPEG buffer
 */
export function createValidJpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);
}

/**
 * Generate a valid minimal DICOM binary buffer with 128-byte preamble + "DICM" prefix
 */
export function createValidDicomBuffer(): Buffer {
  const preamble = Buffer.alloc(128, 0);
  const prefix = Buffer.from('DICM', 'ascii');
  const dataset = Buffer.from([
    // Patient Name Tag (0010,0010)
    0x10, 0x00, 0x10, 0x00, 0x50, 0x4e, 0x0a, 0x00, 0x44, 0x6f, 0x65, 0x5e, 0x4d, 0x61, 0x72, 0x63,
    0x75, 0x73,
    // Patient ID Tag (0010,0020)
    0x10, 0x00, 0x20, 0x00, 0x4c, 0x4f, 0x0e, 0x00, 0x2b, 0x31, 0x36, 0x35, 0x30, 0x35, 0x35, 0x35,
    0x30, 0x30, 0x30, 0x34, 0x20, 0x20,
  ]);
  return Buffer.concat([preamble, prefix, dataset]);
}

/**
 * Generate an oversized buffer exceeding 25MB (e.g. 26 MB)
 */
export function createOversizedBuffer(): Buffer {
  return Buffer.alloc(26 * 1024 * 1024, 0x41);
}

/**
 * Clinical Scenarios Data
 */
export const CLINICAL_SCENARIOS = {
  cbc: {
    title: 'Complete Blood Count (CBC) with Differential',
    reportType: 'Complete Blood Count (CBC)',
    facility: 'CareID Central Hematology Laboratory',
    collectionDate: '2026-11-01',
    tests: [
      { testName: 'Hemoglobin', value: '14.2', unit: 'g/dL', referenceRange: '13.8 - 17.2 g/dL', status: 'normal' },
      { testName: 'Hematocrit', value: '42.5', unit: '%', referenceRange: '40.7 - 50.3 %', status: 'normal' },
      { testName: 'RBC Count', value: '4.85', unit: 'x10^6/uL', referenceRange: '4.50 - 5.90 x10^6/uL', status: 'normal' },
      { testName: 'WBC Count', value: '6.40', unit: 'x10^3/uL', referenceRange: '4.50 - 11.00 x10^3/uL', status: 'normal' },
      { testName: 'Platelet Count', value: '255', unit: 'x10^3/uL', referenceRange: '150 - 450 x10^3/uL', status: 'normal' },
      { testName: 'MCV', value: '87.6', unit: 'fL', referenceRange: '80.0 - 100.0 fL', status: 'normal' },
      { testName: 'MCH', value: '29.3', unit: 'pg', referenceRange: '27.0 - 33.0 pg', status: 'normal' },
      { testName: 'MCHC', value: '33.4', unit: 'g/dL', referenceRange: '32.0 - 36.0 g/dL', status: 'normal' },
      { testName: 'RDW', value: '12.8', unit: '%', referenceRange: '11.5 - 14.5 %', status: 'normal' },
      { testName: 'Neutrophils', value: '58.2', unit: '%', referenceRange: '40.0 - 70.0 %', status: 'normal' },
      { testName: 'Lymphocytes', value: '31.4', unit: '%', referenceRange: '20.0 - 40.0 %', status: 'normal' },
    ],
  },
  lipid: {
    title: 'Comprehensive Lipid Profile Panel',
    reportType: 'Lipid Panel',
    facility: 'CareID Cardiovascular Diagnostics',
    collectionDate: '2026-11-02',
    tests: [
      { testName: 'Total Cholesterol', value: '185', unit: 'mg/dL', referenceRange: '< 200 mg/dL', status: 'normal' },
      { testName: 'HDL Cholesterol', value: '52', unit: 'mg/dL', referenceRange: '> 40 mg/dL', status: 'normal' },
      { testName: 'LDL Cholesterol', value: '108', unit: 'mg/dL', referenceRange: '< 100 mg/dL', status: 'high' },
      { testName: 'Triglycerides', value: '125', unit: 'mg/dL', referenceRange: '< 150 mg/dL', status: 'normal' },
      { testName: 'VLDL Cholesterol', value: '25', unit: 'mg/dL', referenceRange: '5 - 40 mg/dL', status: 'normal' },
      { testName: 'Total / HDL Ratio', value: '3.56', unit: 'ratio', referenceRange: '< 5.0 ratio', status: 'normal' },
    ],
  },
  cmp: {
    title: 'Comprehensive Metabolic Panel (CMP-14)',
    reportType: 'Comprehensive Metabolic Panel',
    facility: 'City General Clinical Chemistry',
    collectionDate: '2026-11-03',
    tests: [
      { testName: 'Glucose (Fasting)', value: '94', unit: 'mg/dL', referenceRange: '70 - 99 mg/dL', status: 'normal' },
      { testName: 'BUN (Blood Urea Nitrogen)', value: '14', unit: 'mg/dL', referenceRange: '7 - 20 mg/dL', status: 'normal' },
      { testName: 'Creatinine', value: '0.92', unit: 'mg/dL', referenceRange: '0.70 - 1.30 mg/dL', status: 'normal' },
      { testName: 'eGFR', value: '98', unit: 'mL/min/1.73m2', referenceRange: '> 60 mL/min/1.73m2', status: 'normal' },
      { testName: 'Sodium', value: '140', unit: 'mEq/L', referenceRange: '136 - 145 mEq/L', status: 'normal' },
      { testName: 'Potassium', value: '4.2', unit: 'mEq/L', referenceRange: '3.5 - 5.1 mEq/L', status: 'normal' },
      { testName: 'Chloride', value: '102', unit: 'mEq/L', referenceRange: '98 - 107 mEq/L', status: 'normal' },
      { testName: 'Carbon Dioxide (CO2)', value: '26', unit: 'mEq/L', referenceRange: '22 - 29 mEq/L', status: 'normal' },
      { testName: 'Calcium', value: '9.4', unit: 'mg/dL', referenceRange: '8.6 - 10.2 mg/dL', status: 'normal' },
      { testName: 'Total Protein', value: '7.1', unit: 'g/dL', referenceRange: '6.4 - 8.3 g/dL', status: 'normal' },
      { testName: 'Albumin', value: '4.4', unit: 'g/dL', referenceRange: '3.5 - 5.0 g/dL', status: 'normal' },
      { testName: 'Bilirubin (Total)', value: '0.6', unit: 'mg/dL', referenceRange: '0.2 - 1.2 mg/dL', status: 'normal' },
      { testName: 'Alkaline Phosphatase (ALP)', value: '68', unit: 'U/L', referenceRange: '44 - 147 U/L', status: 'normal' },
      { testName: 'AST (SGOT)', value: '22', unit: 'U/L', referenceRange: '10 - 40 U/L', status: 'normal' },
      { testName: 'ALT (SGPT)', value: '24', unit: 'U/L', referenceRange: '7 - 56 U/L', status: 'normal' },
    ],
  },
  thyroid: {
    title: 'Thyroid Function Evaluation Panel',
    reportType: 'Thyroid Panel',
    facility: 'Endocrine Diagnostic Reference Laboratory',
    collectionDate: '2026-11-04',
    tests: [
      { testName: 'TSH (Thyroid Stimulating Hormone)', value: '1.85', unit: 'uIU/mL', referenceRange: '0.45 - 4.50 uIU/mL', status: 'normal' },
      { testName: 'Free T4 (Thyroxine)', value: '1.24', unit: 'ng/dL', referenceRange: '0.82 - 1.77 ng/dL', status: 'normal' },
      { testName: 'Free T3 (Triiodothyronine)', value: '3.1', unit: 'pg/mL', referenceRange: '2.0 - 4.4 pg/mL', status: 'normal' },
      { testName: 'Total T3', value: '115', unit: 'ng/dL', referenceRange: '71 - 180 ng/dL', status: 'normal' },
      { testName: 'Thyroid Peroxidase Antibodies (Anti-TPO)', value: '< 9.0', unit: 'IU/mL', referenceRange: '< 35.0 IU/mL', status: 'normal' },
    ],
  },
  imaging: {
    title: 'Digital Chest Radiography (2-View PA & Lateral)',
    reportType: 'Diagnostic Imaging / Radiology',
    facility: 'CareID Advanced Imaging Pavilion',
    collectionDate: '2026-11-04',
    impression: 'No acute cardiopulmonary disease. Lungs are clear without focal consolidation or pneumothorax.',
    tests: [
      { testName: 'Cardiothoracic Ratio', value: '0.44', unit: 'ratio', referenceRange: '< 0.50 ratio', status: 'normal' },
      { testName: 'Pulmonary Vasculature', value: 'Normal', unit: 'qualitative', referenceRange: 'Normal caliber', status: 'normal' },
      { testName: 'Pleural Spaces', value: 'Clear', unit: 'qualitative', referenceRange: 'No effusion', status: 'normal' },
      { testName: 'Bony Thorax', value: 'Intact', unit: 'qualitative', referenceRange: 'No fractures', status: 'normal' },
    ],
  },
  pathology: {
    title: 'Surgical Pathology Summary (Dermatopathology Biopsy)',
    reportType: 'Surgical Pathology',
    facility: 'University Histopathology Institute',
    collectionDate: '2026-11-05',
    tests: [
      { testName: 'Specimen Dimensions', value: '0.4 x 0.3 x 0.2', unit: 'cm', referenceRange: 'Biopsy punch', status: 'normal' },
      { testName: 'Epidermal Keratinization', value: 'Intact', unit: 'qualitative', referenceRange: 'Unremarkable', status: 'normal' },
      { testName: 'Melanocytic Proliferation', value: 'Benign Intradermal Nevus', unit: 'diagnosis', referenceRange: 'No atypia', status: 'normal' },
      { testName: 'Surgical Margins', value: 'Negative / Clear (> 2mm)', unit: 'qualitative', referenceRange: 'Clear', status: 'normal' },
    ],
  },
  urinalysis: {
    title: 'Automated Complete Urinalysis with Microscopic Examination',
    reportType: 'Urinalysis',
    facility: 'CareID Outpatient Diagnostic Lab',
    collectionDate: '2026-11-06',
    tests: [
      { testName: 'Color', value: 'Yellow', unit: 'qualitative', referenceRange: 'Yellow / Straw', status: 'normal' },
      { testName: 'Clarity', value: 'Clear', unit: 'qualitative', referenceRange: 'Clear', status: 'normal' },
      { testName: 'Specific Gravity', value: '1.018', unit: 'sg', referenceRange: '1.005 - 1.030', status: 'normal' },
      { testName: 'pH', value: '6.0', unit: 'pH', referenceRange: '4.6 - 8.0', status: 'normal' },
      { testName: 'Protein', value: 'Negative', unit: 'qualitative', referenceRange: 'Negative', status: 'normal' },
      { testName: 'Glucose', value: 'Negative', unit: 'qualitative', referenceRange: 'Negative', status: 'normal' },
      { testName: 'Ketones', value: 'Negative', unit: 'qualitative', referenceRange: 'Negative', status: 'normal' },
      { testName: 'Microscopic RBC', value: '0 - 2', unit: '/HPF', referenceRange: '0 - 3 /HPF', status: 'normal' },
      { testName: 'Microscopic WBC', value: '1 - 2', unit: '/HPF', referenceRange: '0 - 5 /HPF', status: 'normal' },
    ],
  },
  cardiac: {
    title: 'Emergency Cardiac Biomarker STAT Panel',
    reportType: 'Cardiac Biomarkers',
    facility: 'CareID Emergency Medicine Lab',
    collectionDate: '2026-11-07',
    tests: [
      { testName: 'High-Sensitivity Troponin I', value: '0.012', unit: 'ng/mL', referenceRange: '< 0.034 ng/mL', status: 'normal' },
      { testName: 'CK-MB (Creatine Kinase-MB)', value: '2.8', unit: 'ng/mL', referenceRange: '0.0 - 5.0 ng/mL', status: 'normal' },
      { testName: 'Myoglobin', value: '38', unit: 'ng/mL', referenceRange: '25 - 72 ng/mL', status: 'normal' },
      { testName: 'NT-proBNP', value: '64', unit: 'pg/mL', referenceRange: '< 125 pg/mL', status: 'normal' },
    ],
  },
};
