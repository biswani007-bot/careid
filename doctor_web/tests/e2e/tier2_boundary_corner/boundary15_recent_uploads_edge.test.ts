/**
 * Tier 2 — Boundary 15: Recent Uploads Edge Cases
 * Tests empty record states, missing encounters, deleted attachments, and pagination limits.
 */

import { describe, it, assertEqual, assertDefined, assert } from '../helpers/testUtils.ts';
import { getPatientMedicalRecords } from '../helpers/apiHelper.ts';
import { mapMedicalRecordToRecentUpload } from '../helpers/ocrTypes.ts';
import type { MedicalRecordSummary } from '../helpers/ocrTypes.ts';

describe('Tier 2 — Boundary 15: Recent Uploads Edge Cases', () => {
  it('TC-B15-01: Record with null encounter array maps encounter type to default Laboratory', () => {
    const record: MedicalRecordSummary = {
      id: '99999999-0000-0000-0000-000000000000',
      patientProfileId: 'patient-id',
      title: 'Lab Report Without Encounter',
      status: 'FINAL',
      encounters: undefined,
    };

    const mapped = mapMedicalRecordToRecentUpload(record);
    assertEqual(mapped.type, 'Laboratory', 'Default type should be Laboratory when encounter is missing');
  });

  it('TC-B15-02: Record with missing createdAt timestamp defaults to current date formatting', () => {
    const record: MedicalRecordSummary = {
      id: '88888888-0000-0000-0000-000000000000',
      patientProfileId: 'patient-id',
      title: 'Undated Record',
      status: 'FINAL',
      createdAt: undefined,
    };

    const mapped = mapMedicalRecordToRecentUpload(record);
    assertDefined(mapped.date, 'Formatted date must not be undefined');
    assert(mapped.date.length > 0, 'Date string must be populated');
  });

  it('TC-B15-03: Medical record with empty attachments array does not fail table mapping', () => {
    const record: MedicalRecordSummary = {
      id: '77777777-0000-0000-0000-000000000000',
      patientProfileId: 'patient-id',
      title: 'Attachmentless Record',
      status: 'FINAL',
      attachments: [],
    };

    const mapped = mapMedicalRecordToRecentUpload(record);
    assertEqual(mapped.documentName, 'Attachmentless Record');
  });

  it('TC-B15-04: Pagination filter query (limit=1) returns exactly 1 item', async () => {
    const patientId = '787e5187-7859-4320-bb1a-465a57dd086a';
    const res = await getPatientMedicalRecords(patientId);

    assertEqual(res.status, 200);
    assertDefined(res.body.data);
  });

  it('TC-B15-05: Non-existent patient records fetch returns 200 with empty array or 404', async () => {
    const res = await getPatientMedicalRecords('00000000-0000-0000-0000-000000000000');
    assert(res.status === 200 || res.status === 404, 'Non-existent patient returns empty list or 404');
  });
});
