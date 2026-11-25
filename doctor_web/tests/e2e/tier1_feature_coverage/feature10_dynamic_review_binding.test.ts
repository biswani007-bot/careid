/**
 * Tier 1 — Feature 10: Dynamic Clinical Review Binding
 * Validates dynamic parsing and binding of OCR fields to UI review structures without static mocks.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
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

describe('Feature 10: Dynamic Clinical Review Binding', () => {
  it('TC-F10-01: Dynamically binds extracted patient demographics to review model', () => {
    const fields: BackendOcrField[] = [
      { id: '1', ocrJobId: 'job-1', fieldName: 'patient_name', fieldValue: 'Marcus Doe', confidence: 0.98, validationStatus: 'VALIDATED' },
      { id: '2', ocrJobId: 'job-1', fieldName: 'mrn', fieldValue: '+16505550004', confidence: 0.96, validationStatus: 'VALIDATED' },
      { id: '3', ocrJobId: 'job-1', fieldName: 'dob', fieldValue: '1990-01-01', confidence: 0.95, validationStatus: 'VALIDATED' },
      { id: '4', ocrJobId: 'job-1', fieldName: 'gender', fieldValue: 'Male', confidence: 0.99, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');
    const mrnField = result.demographicsAndDetails.find((f) => f.id === 'hv_id');

    assertDefined(nameField);
    assertEqual(nameField.value, 'Marcus Doe');
    assertEqual(nameField.status, 'verified');
    assertDefined(mrnField);
    assertEqual(mrnField.value, '+16505550004');
  });

  it('TC-F10-02: Dynamically binds extracted lab values (Hemoglobin, WBC, Platelets) without static defaults', () => {
    const fields: BackendOcrField[] = [
      { id: '10', ocrJobId: 'job-1', fieldName: 'hemoglobin', fieldValue: '15.2 g/dL', confidence: 0.94, validationStatus: 'VALIDATED' },
      { id: '11', ocrJobId: 'job-1', fieldName: 'wbc', fieldValue: '7,200 /uL', confidence: 0.92, validationStatus: 'VALIDATED' },
      { id: '12', ocrJobId: 'job-1', fieldName: 'platelet_count', fieldValue: '310,000 /uL', confidence: 0.91, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const hgb = result.labRows.find((r) => r.testName === 'Hemoglobin');
    const wbc = result.labRows.find((r) => r.testName === 'WBC Count');

    assertDefined(hgb, 'Hemoglobin row must be bound');
    assertEqual(hgb.value, '15.2');
    assertEqual(hgb.unit, 'g/dL');
    assertDefined(wbc, 'WBC row must be bound');
    assertEqual(wbc.value, '7,200');
  });

  it('TC-F10-03: Classifies low confidence (< 0.75) fields as needs-review', () => {
    const fields: BackendOcrField[] = [
      { id: '20', ocrJobId: 'job-1', fieldName: 'patient_name', fieldValue: 'M. Doe', confidence: 0.62, validationStatus: 'REVIEW_REQUIRED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');

    assertDefined(nameField);
    assertEqual(nameField.status, 'needs-review', 'Confidence < 0.75 must trigger needs-review status');
  });

  it('TC-F10-04: Identifies divergent Health ID / MRN and attaches warningNote', () => {
    const fields: BackendOcrField[] = [
      { id: '30', ocrJobId: 'job-1', fieldName: 'mrn', fieldValue: 'DIFF-MRN-999', confidence: 0.95, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const mrnField = result.demographicsAndDetails.find((f) => f.id === 'hv_id');

    assertDefined(mrnField);
    assertEqual(mrnField.status, 'needs-review');
    assertDefined(mrnField.warningNote, 'Warning note must be set when MRN diverges from chart');
  });

  it('TC-F10-05: Binds facility name and collection date to report details section', () => {
    const fields: BackendOcrField[] = [
      { id: '40', ocrJobId: 'job-1', fieldName: 'facility', fieldValue: 'CareID City Diagnostics', confidence: 0.93, validationStatus: 'VALIDATED' },
      { id: '41', ocrJobId: 'job-1', fieldName: 'report_date', fieldValue: '2026-11-05', confidence: 0.95, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(fields, '', mockPatient);
    const facField = result.demographicsAndDetails.find((f) => f.id === 'hospital_facility');
    const dateField = result.demographicsAndDetails.find((f) => f.id === 'collection_date');

    assertDefined(facField);
    assertEqual(facField.value, 'CareID City Diagnostics');
    assertDefined(dateField);
    assertEqual(dateField.value, '2026-11-05');
  });
});
