/**
 * Tier 4 — Clinical Scenario 5: Diagnostic Imaging / Radiology Scan Report
 * Simulates radiology workflow: DICOM / PNG imaging, cardiothoracic ratio, pulmonary vascularity, and impression.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPngBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 5: Diagnostic Imaging / Radiology', () => {
  it('TC-C05: Radiographic study ingestion, structural findings review, and diagnostic impression save', async () => {
    const imgData = CLINICAL_SCENARIOS.imaging;

    const imgBuffer = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(imgBuffer, 'chest_radiograph_pa.png', 'image/png', {
      category: 'RADIOLOGY',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    const clinicalNotes = [
      `Radiological Study Report: ${imgData.title}`,
      `Facility: ${imgData.facility}`,
      `Exam Date: ${imgData.collectionDate}`,
      `Impression: ${imgData.impression}`,
      '--- Anatomical Findings ---',
      ...imgData.tests.map((t) => `${t.testName}: ${t.value} (Normal: ${t.referenceRange})`),
    ].join('\n');

    const recordTitle = `${imgData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Pre-operative cardiopulmonary clearance',
      clinicalNotes,
      treatmentPlan: 'Clear for non-cardiac procedural intervention.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: imgData.facility,
        encounterType: 'RADIOLOGY',
        encounterDate: new Date().toISOString(),
      },
      attachments: [
        {
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          storageUrl: attachment.storageUrl,
          category: 'RADIOLOGY',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201);
    assertDefined(res.body.data);
  });
});
