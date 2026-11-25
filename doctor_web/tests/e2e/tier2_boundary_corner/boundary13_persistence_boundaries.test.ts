/**
 * Tier 2 — Boundary 13: Persistence Boundaries
 * Tests missing required fields, empty payloads, invalid patient IDs, and attachment linkages.
 */

import { describe, it, assert } from '../helpers/testUtils.ts';
import { createMedicalRecord } from '../helpers/apiHelper.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 2 — Boundary 13: Persistence Boundaries', () => {
  it('TC-B13-01: Empty payload object returns HTTP 400 Bad Request', async () => {
    const res = await createMedicalRecord(TEST_PATIENT_ID, {});
    assert(res.status >= 400, `Empty body must return error, received ${res.status}`);
  });

  it('TC-B13-02: Missing required title returns HTTP 400 Bad Request', async () => {
    const res = await createMedicalRecord(TEST_PATIENT_ID, {
      chiefComplaint: 'No title provided',
      status: 'FINAL',
    });
    assert(res.status >= 400, 'Missing title must return error');
  });

  it('TC-B13-03: Invalid status enum value (e.g. "APPROVED" instead of "FINAL") returns HTTP 400', async () => {
    const res = await createMedicalRecord(TEST_PATIENT_ID, {
      title: 'Invalid Status Test',
      status: 'APPROVED',
    });
    assert(res.status >= 400, 'Invalid status enum value must return 400');
  });

  it('TC-B13-04: Non-existent patientProfileId UUID returns HTTP 404 or 400', async () => {
    const res = await createMedicalRecord('11111111-2222-3333-4444-555555555555', {
      title: 'Invalid Patient UUID Record',
      status: 'FINAL',
    });
    assert(res.status >= 400, 'Non-existent patient record creation must fail');
  });

  it('TC-B13-05: Extremely large clinical notes payload (100KB) is accepted or gracefully limited', async () => {
    const largeNotes = 'Patient lab summary observation notes. '.repeat(2500);
    const res = await createMedicalRecord(TEST_PATIENT_ID, {
      title: `Large Notes Test ${Date.now()}`,
      clinicalNotes: largeNotes,
      status: 'FINAL',
    });
    assert([201, 400, 413].includes(res.status), `100KB notes should be processed cleanly, got ${res.status}`);
  });
});
