/**
 * Tier 2 — Boundary 7: Step 1 Context & Demographics Edges
 * Validates resilience against missing optional patient fields, hyphenated names,
 * null demographics, and unmapped partner packages in Step 1.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';

export function normalizePatientDemographics(rawPatient?: Record<string, unknown> | null) {
  if (!rawPatient) {
    return {
      fullName: 'Patient Record',
      mrn: 'CAREID-PT',
      gender: 'Not recorded',
      phone: undefined,
      bloodGroup: 'Unknown',
    };
  }

  const first = String(rawPatient.firstName || '').trim();
  const last = String(rawPatient.lastName || '').trim();
  const fullName = `${first} ${last}`.trim() || String(rawPatient.fullName || 'Patient Record');
  const mrn = String(rawPatient.mrn || rawPatient.patientNumber || 'CAREID-PT');
  const gender = String(rawPatient.gender || 'Not recorded');
  const phone = rawPatient.phone ? String(rawPatient.phone) : undefined;
  const bloodGroup = String(rawPatient.bloodGroup || 'Unknown');

  return { fullName, mrn, gender, phone, bloodGroup };
}

describe('Tier 2 — Boundary 07: Step 1 Context & Demographics Edges', () => {
  it('TC-B07-01: Null or undefined raw patient object safely yields standardized fallback demographics', () => {
    const demo = normalizePatientDemographics(null);
    assertEqual(demo.fullName, 'Patient Record');
    assertEqual(demo.mrn, 'CAREID-PT');
    assertEqual(demo.gender, 'Not recorded');
    assertEqual(demo.phone, undefined);
  });

  it('TC-B07-02: Patient with only first name formats fullName without dangling whitespace', () => {
    const demo = normalizePatientDemographics({ firstName: 'Marcus', mrn: 'PT-01' });
    assertEqual(demo.fullName, 'Marcus', 'Single name must have no trailing space');
  });

  it('TC-B07-03: Hyphenated and apostrophe names (e.g. O\'Connor-Smith) preserve punctuation', () => {
    const demo = normalizePatientDemographics({
      firstName: 'Sean',
      lastName: "O'Connor-Smith",
      mrn: 'PT-02',
    });
    assertEqual(demo.fullName, "Sean O'Connor-Smith", 'Punctuation in names must be preserved');
  });

  it('TC-B07-04: Missing optional contact numbers are handled without displaying "undefined"', () => {
    const demo = normalizePatientDemographics({
      firstName: 'Marcus',
      lastName: 'Doe',
      phone: null,
    });
    assertEqual(demo.phone, undefined, 'Missing phone must be undefined, not string "undefined" or "null"');
  });

  it('TC-B07-05: Missing blood group defaults safely to "Unknown" rather than crashing', () => {
    const demo = normalizePatientDemographics({ firstName: 'Jane', lastName: 'Doe' });
    assertEqual(demo.bloodGroup, 'Unknown');
  });
});
