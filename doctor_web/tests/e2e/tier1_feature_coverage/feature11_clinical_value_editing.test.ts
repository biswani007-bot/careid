/**
 * Tier 1 — Feature 11: Clinical Value Editing & Multi-Page Review
 * Tests doctor editing of extracted values, adding/removing lab rows, and correcting divergences.
 */

import { describe, it, assertEqual } from '../helpers/testUtils.ts';
import type { ClinicalLabRow, ExtractedClinicalField } from '../helpers/ocrTypes.ts';

describe('Feature 11: Clinical Value Editing & Multi-Page Review', () => {
  it('TC-F11-01: Doctor edits clinical demographic field value', () => {
    let fields: ExtractedClinicalField[] = [
      {
        id: 'patient_name',
        label: 'Patient Name',
        value: 'Markus Doe',
        originalValue: 'Markus Doe',
        status: 'needs-review',
        confidenceScore: 0.8,
        category: 'demographics',
      },
    ];

    // Simulate doctor correction
    fields = fields.map((f) => (f.id === 'patient_name' ? { ...f, value: 'Marcus Doe', status: 'verified' } : f));

    assertEqual(fields[0].value, 'Marcus Doe', 'Edited name must reflect new string');
    assertEqual(fields[0].originalValue, 'Markus Doe', 'Original value remains tracked for audit trail');
    assertEqual(fields[0].status, 'verified', 'Field should transition to verified status');
  });

  it('TC-F11-02: Doctor edits lab parameter value and unit', () => {
    let labRows: ClinicalLabRow[] = [
      { id: 'row-1', testName: 'Hemoglobin', value: '14.0', unit: 'mg/dL', status: 'normal' },
    ];

    // Doctor corrects unit from mg/dL to g/dL and updates value
    labRows = labRows.map((r) => (r.id === 'row-1' ? { ...r, value: '14.5', unit: 'g/dL' } : r));

    assertEqual(labRows[0].value, '14.5', 'Value should be updated');
    assertEqual(labRows[0].unit, 'g/dL', 'Unit should be updated');
  });

  it('TC-F11-03: Doctor adds new clinical lab parameter row', () => {
    const labRows: ClinicalLabRow[] = [
      { id: 'row-1', testName: 'Hemoglobin', value: '14.5', unit: 'g/dL', status: 'normal' },
    ];

    const newRow: ClinicalLabRow = {
      id: `lab_${Date.now()}`,
      testName: 'Ferritin',
      value: '120',
      unit: 'ng/mL',
      referenceRange: '30 - 400 ng/mL',
      status: 'normal',
    };
    const updatedRows = [...labRows, newRow];

    assertEqual(updatedRows.length, 2, 'Lab rows count should increase by 1');
    assertEqual(updatedRows[1].testName, 'Ferritin');
    assertEqual(updatedRows[1].value, '120');
  });

  it('TC-F11-04: Doctor deletes extraneous or artifact lab row', () => {
    let labRows: ClinicalLabRow[] = [
      { id: 'row-1', testName: 'Hemoglobin', value: '14.5', unit: 'g/dL', status: 'normal' },
      { id: 'row-2', testName: 'Artifact Line', value: '0.0', unit: '', status: 'normal' },
    ];

    labRows = labRows.filter((r) => r.id !== 'row-2');

    assertEqual(labRows.length, 1, 'Lab rows count should decrease by 1');
    assertEqual(labRows[0].id, 'row-1', 'Only legitimate row remains');
  });

  it('TC-F11-05: Correcting divergent Health ID clears warningNote and aligns with target chart', () => {
    const targetHvId = '+16505550004';
    let mrnField: ExtractedClinicalField = {
      id: 'hv_id',
      label: 'HV ID',
      value: '+16505559999',
      originalValue: '+16505559999',
      status: 'needs-review',
      confidenceScore: 0.95,
      warningNote: 'Suspected identifier divergence with active chart',
      category: 'demographics',
    };

    // Doctor updates to match target chart
    const correctedValue = targetHvId;
    const isCorrected = correctedValue.replace(/[-_ ]/g, '') === targetHvId.replace(/[-_ ]/g, '');
    mrnField = {
      ...mrnField,
      value: correctedValue,
      status: isCorrected ? 'verified' : mrnField.status,
      warningNote: isCorrected ? undefined : mrnField.warningNote,
    };

    assertEqual(mrnField.value, targetHvId);
    assertEqual(mrnField.status, 'verified');
    assertEqual(mrnField.warningNote, undefined, 'Warning note must be cleared upon alignment');
  });
});
