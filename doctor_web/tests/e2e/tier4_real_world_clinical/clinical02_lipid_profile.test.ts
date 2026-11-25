/**
 * Tier 4 — Clinical Scenario 2: Comprehensive Lipid Profile Panel
 * Simulates cardiovascular risk screening: Cholesterol, HDL, LDL, Triglycerides, and VLDL.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPngBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 2: Lipid Profile Panel', () => {
  it('TC-C02: End-to-end lipid panel digitization, risk stratification, and record commitment', async () => {
    const lipidData = CLINICAL_SCENARIOS.lipid;

    // 1. Upload scan of lipid panel
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'lipid_panel_scan.png', 'image/png', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    // 2. Format clinical findings
    const clinicalNotes = [
      `Diagnostic Laboratory Panel: ${lipidData.reportType}`,
      `Facility: ${lipidData.facility}`,
      `Collection Date: ${lipidData.collectionDate}`,
      '--- Lipid Subfractions ---',
      ...lipidData.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange}) [${t.status.toUpperCase()}]`),
      'Cardiovascular Assessment: Moderate LDL elevation. Recommend low-saturated fat diet and aerobic exercise.',
    ].join('\n');

    // 3. Persist record
    const recordTitle = `${lipidData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Cardiovascular risk stratification',
      clinicalNotes,
      treatmentPlan: 'Dietary counseling; follow-up fasting lipid panel in 6 months.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: lipidData.facility,
        encounterType: 'LABORATORY',
        encounterDate: new Date().toISOString(),
      },
      diagnoses: [
        {
          description: 'Hyperlipidemia, unspecified',
          code: 'E78.5',
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
