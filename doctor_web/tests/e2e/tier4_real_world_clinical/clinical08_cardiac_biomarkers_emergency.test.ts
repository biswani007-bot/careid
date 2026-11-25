/**
 * Tier 4 — Clinical Scenario 8: Emergency Cardiac Biomarker STAT Panel
 * Simulates urgent coronary triage: High-sensitivity Troponin I, CK-MB, Myoglobin, and NT-proBNP.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer, CLINICAL_SCENARIOS } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 4 — Clinical Scenario 8: Emergency Cardiac Biomarkers', () => {
  it('TC-C08: Rapid STAT cardiac biomarker digitization and immediate chart synchronization', async () => {
    const cardData = CLINICAL_SCENARIOS.cardiac;

    const pdf = createValidPdfBuffer(1, `EMERGENCY STAT: ${cardData.title}`);
    const upRes = await uploadMultipartAttachment(pdf, 'cardiac_biomarkers_stat.pdf', 'application/pdf', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });
    assertEqual(upRes.status, 201);
    const attachment = upRes.body.data!;

    const clinicalNotes = [
      `Emergency Cardiac Protocol: ${cardData.title}`,
      `Facility: ${cardData.facility}`,
      `Collection Date: ${cardData.collectionDate}`,
      '--- STAT Serum Biomarkers ---',
      ...cardData.tests.map((t) => `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.referenceRange})`),
      'Cardiology Evaluation: Negative myocardial necrosis markers. Troponin I below cutoff. Low acute risk.',
    ].join('\n');

    const recordTitle = `${cardData.title} - ${Date.now()}`;
    const payload = {
      title: recordTitle,
      chiefComplaint: 'Atypical chest discomfort rule-out',
      clinicalNotes,
      treatmentPlan: 'Serial troponin completed and negative. Safe for outpatient discharge with cardiology follow-up.',
      status: 'FINAL',
      encounter: {
        providerName: 'Dr. Sarah Jenkins, MD',
        facilityName: cardData.facility,
        encounterType: 'EMERGENCY',
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
