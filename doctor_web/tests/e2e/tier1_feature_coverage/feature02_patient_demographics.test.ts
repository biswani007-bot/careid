/**
 * Tier 1 — Feature 2: Live Patient Demographics Resolution
 * Validates resolving patient 787e5187-7859-4320-bb1a-465a57dd086a from GET /api/v1/doctors/patients/:id.
 */

import { describe, it, assertEqual, assertDefined, assertIncludes } from '../helpers/testUtils.ts';
import { getDoctorPatientProfile } from '../helpers/apiHelper.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 2: Live Patient Demographics Resolution', () => {
  it('TC-F02-01: Successfully resolve live patient profile via GET /doctors/patients/:patientProfileId', async () => {
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    assertEqual(res.status, 200, 'GET patient profile must return HTTP 200 OK');
    assertDefined(res.body.data, 'Data payload must be returned');
    assertEqual(
      (res.body.data as { id: string }).id,
      TEST_PATIENT_ID,
      'Resolved patient ID must match requested UUID'
    );
  });

  it('TC-F02-02: Patient name resolves to authentic name (Marcus Doe) without synthetic fallback', async () => {
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    const data = res.body.data as { firstName?: string; lastName?: string };
    assertEqual(data.firstName, 'Marcus', 'First name must be Marcus');
    assertEqual(data.lastName, 'Doe', 'Last name must be Doe');
  });

  it('TC-F02-03: Patient Date of Birth and gender match authentic database record', async () => {
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    const data = res.body.data as { dateOfBirth?: string; gender?: string };
    assertEqual(data.dateOfBirth, '1990-01-01', 'DOB must be 1990-01-01');
    assertEqual(data.gender, 'Male', 'Gender must be Male');
  });

  it('TC-F02-04: Patient Health ID / MRN / patientNumber resolves to authentic value', async () => {
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    const data = res.body.data as { patientNumber?: string };
    assertDefined(data.patientNumber, 'Patient number / Health ID must be defined');
    assertEqual(data.patientNumber, '+16505550004', 'Patient number should match +16505550004');
  });

  it('TC-F02-05: Clinical metadata fields (bloodGroup, chronicConditions, allergies) are accessible', async () => {
    const res = await getDoctorPatientProfile(TEST_PATIENT_ID);
    const data = res.body.data as { bloodGroup?: string; chronicConditions?: string[]; knownAllergies?: string[] };
    assertEqual(data.bloodGroup, 'O+', 'Blood group must be O+');
    assertDefined(data.chronicConditions, 'Chronic conditions array must be returned');
    assertIncludes(data.chronicConditions, 'Diabetes Type 2', 'Chronic conditions should include Diabetes Type 2');
    assertDefined(data.knownAllergies, 'Allergies array must be returned');
    assertIncludes(data.knownAllergies, 'Penicillin', 'Allergies should include Penicillin');
  });
});
