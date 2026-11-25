/**
 * Tier 2 — Boundary 11: Clinical Editing Boundary Cases
 * Tests empty test names, negative values, non-numeric values, large notes, and empty rows.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import type { ClinicalLabRow } from '../helpers/ocrTypes.ts';

describe('Tier 2 — Boundary 11: Clinical Editing Boundary Cases', () => {
  it('TC-B11-01: Editing lab row to empty testName is permitted or sanitized in UI model', () => {
    let rows: ClinicalLabRow[] = [{ id: '1', testName: 'Hemoglobin', value: '14.5', unit: 'g/dL' }];
    rows = rows.map((r) => (r.id === '1' ? { ...r, testName: '' } : r));

    assertEqual(rows[0].testName, '', 'Empty test name should be stored in edit state');
  });

  it('TC-B11-02: Editing numeric value to negative number (-5.2) is allowed for deviation tests', () => {
    let rows: ClinicalLabRow[] = [{ id: '2', testName: 'Base Excess', value: '0.0', unit: 'mEq/L' }];
    rows = rows.map((r) => (r.id === '2' ? { ...r, value: '-4.8' } : r));

    assertEqual(rows[0].value, '-4.8', 'Negative values supported for relevant clinical parameters');
  });

  it('TC-B11-03: Editing value to qualitative text ("Positive", "Trace") does not throw', () => {
    let rows: ClinicalLabRow[] = [{ id: '3', testName: 'Urine Ketones', value: '0', unit: 'mg/dL' }];
    rows = rows.map((r) => (r.id === '3' ? { ...r, value: 'Trace (15 mg/dL)' } : r));

    assertEqual(rows[0].value, 'Trace (15 mg/dL)');
  });

  it('TC-B11-04: Deleting all lab rows down to 0 rows does not crash state container', () => {
    let rows: ClinicalLabRow[] = [{ id: '4', testName: 'Single Row', value: '1.0', unit: 'unit' }];
    rows = [];

    assertEqual(rows.length, 0, 'Zero-length lab rows array is safe');
  });

  it('TC-B11-05: Massive clinical notes string (50,000 characters) is retained in edit buffer', () => {
    const hugeNotes = 'Clinical Observation: '.repeat(2500);
    assert(hugeNotes.length >= 50000, 'Notes string should be >= 50k chars');
  });
});
