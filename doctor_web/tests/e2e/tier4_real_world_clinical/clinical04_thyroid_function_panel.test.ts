/**
 * Tier 4 — Clinical Scenario 4: Thyroid Function Evaluation Panel
 * Simulates endocrine assessment: TSH, Free T4, Free T3, and anti-TPO antibodies.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 4: Thyroid Function Panel', () => {
  it('TC-C04: Full endocrine review, antibody quantification, and record archiving', async () => {
    const thyroidData = CLINICAL_SCENARIOS.thyroid;

    const pdf = createValidPdfBuffer(1, `ENDOCRINOLOGY REPORT: ${thyroidData.title}`);
    const upRes = await uploadMultipartAttachment(pdf, 'thyroid_panel.pdf', 'application/pdf', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    const clinicalNotes = [
      `Endocrinology Diagnostic Report: ${thyroidData.reportType}`,
      `Facility: ${thyroidData.facility}`,
      `Collection Date: ${thyroidData.collectionDate}`,
      '--- Thyroid Hormone & Antibody Indices ---',
      ...thyroidData.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange})`),
      'Assessment: Euthyroid state confirmed. Negative autoimmune thyroid antibodies.',
    ].join('\n');

    const recordTitle = `${thyroidData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Endocrine panel follow-up',
      clinicalNotes,
      treatmentPlan: 'No hormone therapy required. Re-evaluate annually.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: thyroidData.facility,
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
