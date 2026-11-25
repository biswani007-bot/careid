/**
 * Tier 2 — Boundary 2: Patient Context Edge Cases
 * Tests non-existent UUIDs, malformed inputs, unauthorized access, and special characters.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { getDoctorPatientProfile } from '../helpers/apiHelper.ts';
import { BASE_URL } from '../helpers/authHelper.ts';

describe('Tier 2 — Boundary 2: Patient Context Edge Cases', () => {
  it('TC-B02-01: Non-existent patient UUID returns HTTP 404 Not Found', async () => {
    const res = await getDoctorPatientProfile('00000000-0000-0000-0000-000000000000');
    assertEqual(res.status, 404, 'Non-existent UUID must return 404 Not Found');
  });

  it('TC-B02-02: Malformed non-UUID patient ID returns HTTP 400 or 404', async () => {
    const res = await getDoctorPatientProfile('not-a-valid-uuid');
    assert(res.status >= 400, `Malformed patient ID should return error, got ${res.status}`);
  });

  it('TC-B02-03: Patient resolution without Authorization header returns HTTP 401', async () => {
    const res = await fetch(`${BASE_URL}/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a`);
    assertEqual(res.status, 401, 'Unauthenticated request must return 401 Unauthorized');
  });

  it('TC-B02-04: Patient ID with path traversal or special chars is safely handled', async () => {
    const res = await getDoctorPatientProfile('../../admin/patients');
    assert(res.status >= 400, 'Path traversal in patient ID must be blocked');
  });

  it('TC-B02-05: Patient ID with SQL injection characters is safely rejected', async () => {
    const res = await getDoctorPatientProfile("787e5187' OR '1'='1");
    assert(res.status >= 400, 'SQL injection string in patient ID must be rejected');
  });
});
