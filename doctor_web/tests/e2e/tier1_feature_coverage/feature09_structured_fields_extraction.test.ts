/**
 * Tier 1 — Feature 9: Structured OCR Fields Extraction
 * Tests field extraction, raw text, and json endpoints on live backend.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThan } from '../helpers/testUtils.ts';
import { getOcrJobFields, getOcrJobText } from '../helpers/apiHelper.ts';
import { BASE_URL, getAuthHeaders } from '../helpers/authHelper.ts';

const KNOWN_COMPLETED_JOB_ID = '85d3df42-e799-485d-bb45-161441375d1d';

describe('Feature 9: Structured OCR Fields Extraction', () => {
  it('TC-F09-01: GET /api/v1/ocr/jobs/:id/fields returns structured field objects', async () => {
    const fields = await getOcrJobFields(KNOWN_COMPLETED_JOB_ID);

    assertGreaterThan(fields.length, 0, 'Fields array should contain extracted items');
    assertDefined(fields[0].fieldName, 'Field item must have fieldName');
    assertDefined(fields[0].fieldValue, 'Field item must have fieldValue');
  });

  it('TC-F09-02: Each extracted field provides a numerical confidence score', async () => {
    const fields = await getOcrJobFields(KNOWN_COMPLETED_JOB_ID);

    for (const f of fields.slice(0, 5)) {
      assertDefined(f.confidence, `Field ${f.fieldName} must have confidence score`);
      assertGreaterThan(f.confidence, 0, 'Confidence score must be positive');
    }
  });

  it('TC-F09-03: GET /api/v1/ocr/jobs/:id/text returns authentic extracted raw text', async () => {
    const text = await getOcrJobText(KNOWN_COMPLETED_JOB_ID);

    assertDefined(text, 'Raw text should be returned');
    assertGreaterThan(text.length, 10, 'Raw text length should be substantial');
  });

  it('TC-F09-04: GET /api/v1/ocr/jobs/:id/json returns structured document JSON representation', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/${KNOWN_COMPLETED_JOB_ID}/json`, { headers });

    assertEqual(res.status, 200, 'GET /json endpoint must return 200 OK');
    const json = await res.json();
    assertDefined(json.data || json, 'JSON data must be present');
  });

  it('TC-F09-05: Extracted fields include core clinical parameters (e.g. test_name, hemoglobin, mrn)', async () => {
    const fields = await getOcrJobFields(KNOWN_COMPLETED_JOB_ID);
    const fieldNames = fields.map((f) => f.fieldName.toLowerCase());

    const hasClinicalParam = fieldNames.some(
      (name) => name.includes('hemoglobin') || name.includes('test_name') || name.includes('mrn')
    );
    assertEqual(hasClinicalParam, true, 'Extracted fields must include medical parameters');
  });
});
