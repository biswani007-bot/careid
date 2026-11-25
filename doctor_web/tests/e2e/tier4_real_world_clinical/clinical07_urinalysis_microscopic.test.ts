/**
 * Tier 4 — Clinical Scenario 7: Urinalysis & Microscopic Examination
 * Simulates physical, chemical, and microscopic examination: Specific gravity, pH, protein, cells.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 7: Urinalysis with Microscopy', () => {
  it('TC-C07: Complete automated urinalysis and microscopic sediment review', async () => {
    const uriData = CLINICAL_SCENARIOS.urinalysis;

    const pdf = createValidPdfBuffer(1, `URINALYSIS REPORT: ${uriData.title}`);
    const upRes = await uploadMultipartAttachment(pdf, 'urinalysis_complete.pdf', 'application/pdf', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    const clinicalNotes = [
      `Urinalysis Protocol: ${uriData.title}`,
      `Facility: ${uriData.facility}`,
      `Collection Date: ${uriData.collectionDate}`,
      '--- Physical, Chemical & Microscopic Findings ---',
      ...uriData.tests.map((t) => `${t.testName}: ${t.value} (Ref: ${t.referenceRange})`),
      'Interpretation: Normal urinalysis. No evidence of proteinuria, hematuria, or bacteriuria.',
    ].join('\n');

    const recordTitle = `${uriData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Routine nephrological and urological screening',
      clinicalNotes,
      treatmentPlan: 'Maintain current fluid intake. Normal renal status.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: uriData.facility,
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

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201);
    assertDefined(res.body.data);
  });
});
