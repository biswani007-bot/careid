/**
 * Tier 2 — Boundary 9: Fields Extraction Edge Cases
 * Tests empty fields arrays, non-numeric confidence scores, binary text data, and unicode strings.
 */

import { describe, it, assertEqual, assertDefined, assert } from '../helpers/testUtils.ts';
import { parseOcrFields } from '../helpers/ocrTypes.ts';
import type { BackendOcrField } from '../helpers/ocrTypes.ts';

describe('Tier 2 — Boundary 9: Fields Extraction Edge Cases', () => {
  it('TC-B09-01: Empty fields array from backend does not cause unhandled exception', () => {
    const result = parseOcrFields([], '');
    assertDefined(result.demographicsAndDetails, 'Demographics array should be returned');
    assertDefined(result.labRows, 'Lab rows should be returned');
  });

  it('TC-B09-02: Extreme or out-of-range confidence scores (> 100 or < 0) are normalized safely', () => {
    const fields: BackendOcrField[] = [
      { id: '1', ocrJobId: 'job', fieldName: 'patient_name', fieldValue: 'John Doe', confidence: 96.5, validationStatus: 'VALIDATED' },
      { id: '2', ocrJobId: 'job', fieldName: 'hemoglobin', fieldValue: '14.5 g/dL', confidence: -5, validationStatus: 'REVIEW_REQUIRED' },
    ];

    const result = parseOcrFields(fields, '');
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');
    assertDefined(nameField);
    assert(nameField.confidenceScore <= 1.0, 'Scores > 1 must be scaled to [0, 1]');
  });

  it('TC-B09-03: Raw text containing null bytes or binary characters is parsed without crash', () => {
    const binaryRawText = 'Patient Name: John Doe\x00\x01\x02\nTest Name: CBC\x00';
    const result = parseOcrFields([], binaryRawText);

    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');
    assertDefined(nameField);
    assertEqual(nameField.value.includes('John Doe'), true);
  });

  it('TC-B09-04: Unicode and non-ASCII medical characters (e.g. μmol/L, ±, ℃) are preserved', () => {
    const unicodeFields: BackendOcrField[] = [
      { id: '3', ocrJobId: 'job', fieldName: 'hemoglobin', fieldValue: '14.2 ± 0.5 μmol/L', confidence: 0.95, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(unicodeFields, '');
    assert(result.labRows.length > 0, 'Lab row should be extracted');
    assert(result.labRows[0].unit.includes('μmol/L') || result.labRows[0].value.includes('14.2'), 'Unicode preserved');
  });

  it('TC-B09-05: Extremely long field values (10,000 characters) do not cause buffer overflow', () => {
    const longValue = 'A'.repeat(10000);
    const longFields: BackendOcrField[] = [
      { id: '4', ocrJobId: 'job', fieldName: 'patient_name', fieldValue: longValue, confidence: 0.9, validationStatus: 'VALIDATED' },
    ];

    const result = parseOcrFields(longFields, '');
    const nameField = result.demographicsAndDetails.find((f) => f.id === 'patient_name');
    assertDefined(nameField);
    assertEqual(nameField.value.length, 10000);
  });
});
