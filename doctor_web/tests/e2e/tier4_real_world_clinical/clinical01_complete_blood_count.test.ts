/**
 * Tier 4 — Clinical Scenario 1: Complete Blood Count (CBC) with Differential
 * Full clinical simulation: 11 hematology parameters, reference ranges, doctor review, and final persistence.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 1: Complete Blood Count (CBC)', () => {
  it('TC-C01: Full digitized workflow for Complete Blood Count panel with 11 parameters', async () => {
    const cbcData = CLINICAL_SCENARIOS.cbc;

    // 1. Generate & Upload CBC PDF report
    const pdfBuffer = createValidPdfBuffer(1, `LABORATORY REPORT: ${cbcData.title} - Patient Marcus Doe`);
    const upRes = await uploadMultipartAttachment(pdfBuffer, 'cbc_differential_panel.pdf', 'application/pdf', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201, 'CBC PDF upload must return 201 Created');
    const attachment = upRes.body.data!;

    // 2. Format clinical notes from 11 hematological parameters
    const clinicalNotes = [
      `Digitized Diagnostic Laboratory Report: ${cbcData.reportType}`,
      `Facility: ${cbcData.facility}`,
      `Collection Date: ${cbcData.collectionDate}`,
      '--- Hematological Parameters ---',
      ...cbcData.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange}) [${t.status.toUpperCase()}]`),
      'Clinical Interpretation: Erythrocyte and leukocyte indices within standard physiological limits.',
    ].join('\n');

    // 3. Persist record to live patient chart
    const recordTitle = `${cbcData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Routine annual hematological evaluation',
      clinicalNotes,
      treatmentPlan: 'Maintain current preventative lifestyle. Repeat panel in 12 months.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: cbcData.facility,
        encounterType: 'LABORATORY',
        encounterDate: new Date().toISOString(),
      },
      diagnoses: [
        {
          description: 'Routine general medical examination without abnormal findings',
          code: 'Z00.00',
          type: 'PRIMARY',
          status: 'ACTIVE',
        },
      ],
      procedures: [
        {
          name: 'Complete Blood Count (CBC) with Automated Differential',
          code: 'CPT-85025',
          performedAt: cbcData.collectionDate,
          notes: 'Automated laser flow cytometry.',
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
    assertEqual(res.status, 201, 'Medical record created successfully');
    assertDefined(res.body.data, 'Persisted record returned');
  });
});
