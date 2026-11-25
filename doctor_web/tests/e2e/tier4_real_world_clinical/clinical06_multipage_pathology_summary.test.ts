/**
 * Tier 4 — Clinical Scenario 6: Multi-Page Surgical Pathology Summary
 * Simulates biopsy histological evaluation: specimen gross description, margins, and diagnosis.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 6: Surgical Pathology Summary', () => {
  it('TC-C06: Processing 3-page biopsy pathology summary with histology margins confirmation', async () => {
    const pathData = CLINICAL_SCENARIOS.pathology;

    const pdf = createValidPdfBuffer(3, `SURGICAL PATHOLOGY PROTOCOL: ${pathData.title}`);
    const upRes = await uploadMultipartAttachment(pdf, 'surgical_pathology_3page.pdf', 'application/pdf', {
      category: 'PATHOLOGY',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    const clinicalNotes = [
      `Histopathology Diagnostic Protocol: ${pathData.title}`,
      `Facility: ${pathData.facility}`,
      `Procedure Date: ${pathData.collectionDate}`,
      '--- Pathological & Histological Parameters ---',
      ...pathData.tests.map((t) => `${t.testName}: ${t.value} [${t.referenceRange}]`),
      'Diagnostic Conclusion: Benign intradermal melanocytic lesion with complete surgical margin clearance.',
    ].join('\n');

    const recordTitle = `${pathData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Histological verification of excisional biopsy',
      clinicalNotes,
      treatmentPlan: 'Excision site healing well. Routine dermatological surveillance.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: pathData.facility,
        encounterType: 'PATHOLOGY',
        encounterDate: new Date().toISOString(),
      },
      attachments: [
        {
          fileName: attachment.fileName,
          originalName: attachment.originalName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          storageUrl: attachment.storageUrl,
          category: 'PATHOLOGY',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201);
    assertDefined(res.body.data);
  });
});
