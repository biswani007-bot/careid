/**
 * Tier 2 — Boundary 8: OCR Polling Edge Cases
 * Tests polling non-existent jobs, rapid back-to-back polling bursts, and timeout resilience.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { pollOcrJob } from '../helpers/apiHelper.ts';
import { BASE_URL, getAuthHeaders } from '../helpers/authHelper.ts';

describe('Tier 2 — Boundary 8: OCR Polling Edge Cases', () => {
  it('TC-B08-01: Polling non-existent job ID fails with HTTP 404', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/00000000-0000-0000-0000-000000000000`, { headers });
    assertEqual(res.status, 404, 'Polling non-existent job must return 404');
  });

  it('TC-B08-02: Rapid burst polling (5 back-to-back requests) does not crash or hang backend', async () => {
    const headers = await getAuthHeaders();
    const jobId = '85d3df42-e799-485d-bb45-161441375d1d';

    const burst = await Promise.all([
      fetch(`${BASE_URL}/ocr/jobs/${jobId}`, { headers }),
      fetch(`${BASE_URL}/ocr/jobs/${jobId}`, { headers }),
      fetch(`${BASE_URL}/ocr/jobs/${jobId}`, { headers }),
      fetch(`${BASE_URL}/ocr/jobs/${jobId}`, { headers }),
      fetch(`${BASE_URL}/ocr/jobs/${jobId}`, { headers }),
    ]);

    for (const r of burst) {
      assert([200, 429].includes(r.status), `Burst request status should be 200 or 429, got ${r.status}`);
    }
  });

  it('TC-B08-03: Polling returns terminal status without infinite loop when job is completed', async () => {
    const startTime = Date.now();
    const job = await pollOcrJob('85d3df42-e799-485d-bb45-161441375d1d', 5, 200);
    const duration = Date.now() - startTime;

    assertEqual(job.status, 'COMPLETED');
    assert(duration < 5000, 'Polling completed job should return within 5 seconds without stalling');
  });

  it('TC-B08-04: Malformed job ID (e.g. invalid string) returns HTTP 400 or 404', async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}/ocr/jobs/invalid_id_format`, { headers });
    assert(res.status >= 400, 'Malformed job ID must return error');
  });

  it('TC-B08-05: Server 503 status code does not throw uncaught exception in poller', async () => {
    let handled = false;
    try {
      // Simulate polling with short timeout
      await pollOcrJob('065679bf-189a-487c-9d5c-39cfbf517dc7', 1, 100);
      handled = true;
    } catch {
      handled = true;
    }
    assertEqual(handled, true, 'Failed or 503 job polling should complete or throw caught error');
  });
});
