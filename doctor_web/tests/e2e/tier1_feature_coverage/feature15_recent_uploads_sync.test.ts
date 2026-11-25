/**
 * Tier 1 — Feature 15: Live Recent Uploads Synchronization
 * Validates refreshing Recent Uploads table from live backend records and cross-session persistence.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThan } from '../helpers/testUtils.ts';
import { getPatientMedicalRecords, createMedicalRecord } from '../helpers/apiHelper.ts';
import { mapMedicalRecordToRecentUpload } from '../helpers/ocrTypes.ts';
import type { MedicalRecordSummary } from '../helpers/ocrTypes.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 15: Live Recent Uploads Synchronization', () => {
  it('TC-F15-01: Fetch patient medical records via GET /doctors/patients/:patientProfileId/medical-records', async () => {
    const res = await getPatientMedicalRecords(TEST_PATIENT_ID);
    assertEqual(res.status, 200, 'GET medical records must return 200 OK');
    assertDefined(res.body.data, 'Medical records list should be present');
  });

  it('TC-F15-02: Patient medical records can be queried and synchronized with status 200', async () => {
    const uniqueTitle = `Sync Test Record ${Date.now()}`;
    const createRes = await createMedicalRecord(TEST_PATIENT_ID, {
      title: uniqueTitle,
      chiefComplaint: 'Testing list synchronization',
      clinicalNotes: 'Auto-sync verification',
      status: 'FINAL',
    });
    assertEqual(createRes.status, 201, 'Record must be created with 201');

    const res = await getPatientMedicalRecords(TEST_PATIENT_ID);
    assertEqual(res.status, 200, 'Synchronized list must return 200');
    assertDefined(res.body.data, 'Synchronized list data must be present');
  });

  it('TC-F15-03: Maps MedicalRecord backend model to RecentUploadRecord table structure', () => {
    const record: MedicalRecordSummary = {
      id: '45d5ba2a-05bd-4a7f-ad34-fe9e677cff78',
      patientProfileId: TEST_PATIENT_ID,
      title: 'Complete Blood Count Panel',
      status: 'FINAL',
      createdAt: '2026-11-05T10:00:00Z',
      encounters: [{ encounterType: 'LABORATORY' }],
    };

    const mapped = mapMedicalRecordToRecentUpload(record);
    assertEqual(mapped.id, 'REC-45D5BA', 'Formatted display ID must start with REC-');
    assertEqual(mapped.documentName, 'Complete Blood Count Panel');
    assertEqual(mapped.status, 'Verified', 'FINAL status should map to Verified');
    assertEqual(mapped.action, 'View', 'Verified record should offer View action');
  });

  it('TC-F15-04: Maps PRELIMINARY record status to "Needs Review"', () => {
    const record: MedicalRecordSummary = {
      id: '12345678-05bd-4a7f-ad34-fe9e677cff78',
      patientProfileId: TEST_PATIENT_ID,
      title: 'Urgent Biopsy Scan',
      status: 'PRELIMINARY',
      createdAt: '2026-11-06T10:00:00Z',
    };

    const mapped = mapMedicalRecordToRecentUpload(record);
    assertEqual(mapped.status, 'Needs Review', 'PRELIMINARY status must map to Needs Review');
    assertEqual(mapped.action, 'Review', 'Needs Review record should offer Review action');
  });

  it('TC-F15-05: Synchronized records persist across independent client fetches', async () => {
    const fetch1 = await getPatientMedicalRecords(TEST_PATIENT_ID);
    const fetch2 = await getPatientMedicalRecords(TEST_PATIENT_ID);

    const count1 = (Array.isArray(fetch1.body.data) ? fetch1.body.data : []).length;
    const count2 = (Array.isArray(fetch2.body.data) ? fetch2.body.data : []).length;

    assertEqual(count1, count2, 'Record counts must be consistent across independent queries');
    assertGreaterThan(count1, 0, 'Patient chart should have records populated');
  });
});
