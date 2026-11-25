/**
 * Tier 2 — Boundary 10: Dynamic Clinical Review Binding Edge Cases
 * Tests missing names, mismatched dates, extreme confidence levels, and unmapped entities.
 */

import { describe, it, assertEqual, assertDefined, assert } from '../helpers/testUtils.ts';
import { parseOcrFields } from '../helpers/ocrTypes.ts';
import type { PatientSummary, BackendOcrField } from '../helpers/ocrTypes.ts';

const mockPatient: PatientSummary = {
  id: '787e5187-7859-4320-bb1a-465a57dd086a',
  name: 'Marcus Doe',
  healthVaultId: '+16505550004',
  age: '36',
  gender: 'Male',
  dob: '1990-01-01',
  verified: true,
};

describe('Tier 2 — Boundary 10: Dynamic Clinical Review Binding Edge Cases', () => {
  it('TC-B10-01: Missing patient name in fields and rawText defaults to active target patient', () => {
    const result = parseOcrFields([], '', mockPatient);
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');

    assertDefined(nameField);
    assertEqual(nameField.value, 'Marcus Doe', 'Should fall back to chart name if OCR contains no name');
  });

  it('TC-B10-02: Zero-confidence field (0.0) is flagged as needs-review', () => {
    const fields: BackendOcrField[] = [
      { id: '1', ocrJobId: 'job', fieldName: 'patient_name', fieldValue: 'Uncertain Name', confidence: 0.0, validationStatus: 'UNVALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');

    assertDefined(nameField);
    assertEqual(nameField.status, 'needs-review', 'Zero confidence must require review');
  });

  it('TC-B10-03: Empty string fieldValue does not crash the parser', () => {
    const fields: BackendOcrField[] = [
      { id: '2', ocrJobId: 'job', fieldName: 'hemoglobin', fieldValue: '', confidence: 0.5, validationStatus: 'FAILED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    assertDefined(result.labRows);
  });

  it('TC-B10-04: Non-matching patient ID sets warning note and triggers divergence alert', () => {
    const fields: BackendOcrField[] = [
      { id: '3', ocrJobId: 'job', fieldName: 'mrn', fieldValue: '+19999999999', confidence: 0.95, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const mrnField = result.demographicsAndDetails.find((f) => f.id === 'hv_id');

    assertDefined(mrnField);
    assert(mrnField.warningNote !== undefined, 'Divergent MRN must produce warning note');
  });

  it('TC-B10-05: Missing facility field receives standard diagnostic fallback or empty string', () => {
    const result = parseOcrFields([], '', mockPatient);
    const facField = result.demographicsAndDetails.find((f) => f.id === 'hospital_facility');

    assertDefined(facField);
    assert(facField.value.length > 0, 'Facility should have default label');
  });
});
