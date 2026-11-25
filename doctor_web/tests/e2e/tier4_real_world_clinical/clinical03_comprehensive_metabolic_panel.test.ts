/**
 * Tier 4 — Clinical Scenario 3: Comprehensive Metabolic Panel (CMP-14)
 * Simulates renal function, hepatic enzyme markers, electrolytes, and glucose evaluation.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 3: Comprehensive Metabolic Panel (CMP)', () => {
  it('TC-C03: End-to-end processing of 14-parameter CMP panel and patient chart commitment', async () => {
    const cmpData = CLINICAL_SCENARIOS.cmp;

    // 1. Upload multi-page CMP lab report
    const pdf = createValidPdfBuffer(2, `CLINICAL BIOCHEMISTRY: ${cmpData.title}`);
    const upRes = await uploadMultipartAttachment(pdf, 'cmp_panel_report.pdf', 'application/pdf', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    // 2. Format clinical notes for all 15 CMP parameters
    const clinicalNotes = [
      `Diagnostic Laboratory Panel: ${cmpData.reportType}`,
      `Facility: ${cmpData.facility}`,
      `Collection Date: ${cmpData.collectionDate}`,
      '--- Renal, Hepatic & Electrolyte Parameters ---',
      ...cmpData.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange})`),
      'Clinical Summary: Renal and hepatic indices show intact excretory and synthetic functions. Electrolytes balanced.',
    ].join('\n');

    // 3. Persist record
    const recordTitle = `${cmpData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Comprehensive metabolic health monitoring',
      clinicalNotes,
      treatmentPlan: 'Maintain adequate hydration. Continue baseline health regimen.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: cmpData.facility,
        encounterType: 'LABORATORY',
        encounterDate: new Date().toISOString(),
      },
      diagnoses: [
        {
          description: 'Type 2 diabetes mellitus without complications (Controlled)',
          code: 'E11.9',
          type: 'PRIMARY',
          status: 'ACTIVE',
        },
      ],
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
