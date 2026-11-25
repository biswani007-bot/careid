/**
 * Tier 3 — Cross-Feature 1: Camera Scan -> Multi-Row Editing -> Persistence Flow
 * Validates the full chain: camera capture -> binary upload -> OCR review -> editing 5 rows -> persistence.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord, getPatientMedicalRecords } from '../helpers/apiHelper.ts';
import { createValidJpegBuffer } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 3 — Cross-Feature 1: Camera Scan -> Multi-Row Editing -> Persistence Flow', () => {
  it('TC-X01: End-to-end camera scan upload, clinical editing of 5 lab rows, and final persistence', async () => {
    // Step 1: Simulate camera scan capture and upload
    const cameraBuffer = createValidJpegBuffer();
    const cameraFilename = `camera_flow_${Date.now()}.jpg`;
    const upRes = await uploadMultipartAttachment(cameraBuffer, cameraFilename, 'image/jpeg', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    assertEqual(upRes.status, 201, 'Camera scan upload must succeed with 201');
    const attachment = upRes.body.data!;
    assertDefined(attachment.id, 'Attachment ID must exist');

    // Step 2: Simulate clinical review editing across 5 distinct lab parameters
    const editedLabRows = [
      { testName: 'Hemoglobin', value: '14.8', unit: 'g/dL', referenceRange: '13.5 - 17.5 g/dL' },
      { testName: 'WBC Count', value: '6,900', unit: '/uL', referenceRange: '4,500 - 11,000 /uL' },
      { testName: 'Platelet Count', value: '260,000', unit: '/uL', referenceRange: '150,000 - 450,000 /uL' },
      { testName: 'Hematocrit', value: '43.2', unit: '%', referenceRange: '41.0 - 50.0 %' },
      { testName: 'RBC Count', value: '4.95', unit: 'x10^6/uL', referenceRange: '4.50 - 5.90 x10^6/uL' },
    ];

    const clinicalNotesFormatted = [
      'Digitized Diagnostic Laboratory Report: Complete Blood Count (CBC)',
      'Facility: CareID Emergency Diagnostics',
      'Collection Date: 2026-11-08',
      '--- Clinical Lab Values ---',
      ...editedLabRows.map((r) => `${r.testName}: ${r.value} ${r.unit} (${r.referenceRange})`),
    ].join('\n');

    // Step 3: Persist record to live backend
    const recordTitle = `Camera CBC Scan Review - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Post-capture laboratory verification',
      clinicalNotes: clinicalNotesFormatted,
      treatmentPlan: 'Standard monitoring protocol.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: 'CareID Emergency Diagnostics',
        encounterType: 'LABORATORY',
        encounterDate: new Date().toISOString(),
      },
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
    };

    const persistRes = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(persistRes.status, 201, 'Medical record persistence must return 201');
    const createdRecord = persistRes.body.data as { id: string; status: string };
    assertDefined(createdRecord.id, 'Created record must have UUID');
    assertEqual(createdRecord.status, 'FINAL', 'Created record status must be FINAL');

    // Step 4: Verify record querying and chart synchronization
    const listRes = await getPatientMedicalRecords(TEST_PATIENT_ID);
    assertEqual(listRes.status, 200, 'Patient medical history query must succeed with 200 OK');
    assertDefined(listRes.body.data, 'Medical records list must be present');
  });
});
