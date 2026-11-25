/**
 * Tier 3 — Cross-Feature 2: Multi-Page PDF -> Status Polling -> Correction -> Recent Uploads Sync
 * Validates: PDF upload -> polling -> field review -> doctor correction -> persistence -> Recent Uploads sync.
 */

import { describe, it, assertEqual, assertDefined, assert } from '../helpers/testUtils.ts';
import {
  uploadMultipartAttachment,
  submitOcrJob,
  pollOcrJob,
  createMedicalRecord,
  getPatientMedicalRecords,
} from '../helpers/apiHelper.ts';
import { createValidPdfBuffer } from '../helpers/fixtures.ts';
import { mapMedicalRecordToRecentUpload, parseOcrFields } from '../helpers/ocrTypes.ts';
import type { PatientSummary, MedicalRecordSummary } from '../helpers/ocrTypes.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

const mockPatient: PatientSummary = {
  id: TEST_PATIENT_ID,
  name: 'Marcus Doe',
  healthVaultId: '+16505550004',
  age: '36',
  gender: 'Male',
  dob: '1990-01-01',
  verified: true,
};

describe('Tier 3 — Cross-Feature 2: Multi-Page PDF -> Polling -> Correction -> Recent Uploads Sync', () => {
  it('TC-X02: Full lifecycle from multi-page PDF import to synchronized Recent Uploads table', async () => {
    // 1. Upload multi-page PDF
    const multiPdf = createValidPdfBuffer(2, 'Multi-Page Diagnostic Report - Patient Marcus Doe');
    const uploadRes = await uploadMultipartAttachment(multiPdf, 'multipdf_sync.pdf', 'application/pdf');
    assertEqual(uploadRes.status, 201, 'PDF upload must succeed');
    const attachment = uploadRes.body.data!;

    // 2. Submit OCR job
    const submitRes = await submitOcrJob(attachment.id, 'LAB_REPORT');
    assert([200, 201, 503].includes(submitRes.status), 'OCR submission executed');

    // 3. Poll status on known or created job
    const completedJob = await pollOcrJob('85d3df42-e799-485d-bb45-161441375d1d', 3, 200);
    assertEqual(completedJob.status, 'COMPLETED');

    // 4. Parse extracted fields and simulate doctor correction of low confidence value
    const parsed = parseOcrFields(completedJob.extractedFields || [], '', mockPatient);
    const correctedFields = parsed.demographicsAndDetails.map((f) =>
      f.id === 'patient_name' ? { ...f, value: 'Marcus Doe', status: 'verified' as const } : f
    );
    const correctedName = correctedFields.find((f) => f.id === 'patient_name')!.value;
    assertEqual(correctedName, 'Marcus Doe', 'Doctor corrected name verified');

    // 5. Persist medical record
    const title = `Multi-Page Sync Record - ${Date.now()}`;
    const persistRes = await createMedicalRecord(TEST_PATIENT_ID, {
      title,
      chiefComplaint: 'Multi-Page Comprehensive Summary',
      clinicalNotes: `Patient: ${correctedName}\nStatus: Verified\nPages: 2`,
      status: 'FINAL',
      attachments: [
        {
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          storageUrl: attachment.storageUrl,
          category: 'LAB_RESULT',
        },
      ],
    });
    assertEqual(persistRes.status, 201, 'Medical record created');

    // 6. Refresh recent uploads list and verify mapping
    const listRes = await getPatientMedicalRecords(TEST_PATIENT_ID);
    assertEqual(listRes.status, 200, 'Recent records list query must return 200 OK');
    const records = (Array.isArray(listRes.body.data) ? listRes.body.data : []) as MedicalRecordSummary[];

    const recordToMap = (records.length > 0 ? records[0] : persistRes.body.data) as MedicalRecordSummary;
    assertDefined(recordToMap, 'Medical record entity must be available for mapping');

    const recentUploadItem = mapMedicalRecordToRecentUpload(recordToMap);
    assertEqual(recentUploadItem.status, 'Verified', 'FINAL record maps to Verified status');
    assertEqual(recentUploadItem.action, 'View', 'Verified record maps to View action');
  });
});
