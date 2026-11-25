/**
 * Tier 1 — Feature 8: Authentic OCR Status Polling
 * Tests status polling against GET /api/v1/ocr/jobs/:id without fake client-side timers.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThan } from '../helpers/testUtils.ts';
import { pollOcrJob } from '../helpers/apiHelper.ts';
import { BASE_URL, getAuthHeaders } from '../helpers/authHelper.ts';

const KNOWN_COMPLETED_JOB_ID = '85d3df42-e799-485d-bb45-161441375d1d';

describe('Feature 8: Authentic OCR Status Polling', () => {
  it('TC-F08-01: Poll existing completed job returns status COMPLETED from backend', async () => {
    const job = await pollOcrJob(KNOWN_COMPLETED_JOB_ID, 3, 300);

    assertDefined(job.id, 'Job ID must be returned');
    assertEqual(job.status, 'COMPLETED', 'Status should be COMPLETED');
  });

  it('TC-F08-02: OCR job polling reports overallConfidence score', async () => {
    const job = await pollOcrJob(KNOWN_COMPLETED_JOB_ID, 2, 200);

    assertDefined(job.overallConfidence, 'Overall confidence must be present');
    assertGreaterThan(job.overallConfidence!, 0.5, 'Overall confidence should be greater than 0.5');
  });

  it('TC-F08-03: OCR job polling reports extractionEngine telemetry (e.g. PP-OCRv4-Mobile-CPU)', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/${KNOWN_COMPLETED_JOB_ID}`, { headers });
    const json = await res.json();
    const job = json.data || json;

    assertDefined(job.extractionEngine, 'Extraction engine must be defined');
    assertEqual(job.isSimulated, false, 'isSimulated must be false on authentic engine');
  });

  it('TC-F08-04: OCR job polling detects processingTimeMs metric', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/${KNOWN_COMPLETED_JOB_ID}`, { headers });
    const json = await res.json();
    const job = json.data || json;

    assertDefined(job.processingTimeMs, 'Processing time in ms must be returned');
    assertGreaterThan(job.processingTimeMs, 0, 'Processing time should be > 0');
  });

  it('TC-F08-05: Polling non-existent job ID returns HTTP 404', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/00000000-0000-0000-0000-000000000000`, { headers });
    assertEqual(res.status, 404, 'Non-existent job ID must return 404 Not Found');
  });
});
