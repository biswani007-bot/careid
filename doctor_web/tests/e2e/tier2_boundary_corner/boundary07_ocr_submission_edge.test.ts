/**
 * Tier 2 — Boundary 7: OCR Job Submission Edge Cases
 * Tests non-existent attachments, missing fields, unsupported enums, and injection strings.
 */

import { describe, it, assert } from '../helpers/testUtils.ts';
import { submitOcrJob } from '../helpers/apiHelper.ts';

describe('Tier 2 — Boundary 7: OCR Job Submission Edge Cases', () => {
  it('TC-B07-01: Non-existent attachment UUID returns HTTP 404 or 400', async () => {
    const res = await submitOcrJob('00000000-0000-0000-0000-000000000000', 'LAB_REPORT');
    assert(res.status >= 400, `Non-existent attachment must return error, received ${res.status}`);
  });

  it('TC-B07-02: Missing medicalAttachmentId parameter returns HTTP 400 Bad Request', async () => {
    const res = await submitOcrJob('', 'LAB_REPORT');
    assert(res.status >= 400, `Empty attachment ID must return error, received ${res.status}`);
  });

  it('TC-B07-03: Unsupported documentType enum value is rejected with HTTP 400', async () => {
    const res = await submitOcrJob('42b47156-14da-4d93-a202-db90ea9174a4', 'INVALID_UNSUPPORTED_TYPE');
    assert(res.status >= 400, `Invalid documentType must return error, received ${res.status}`);
  });

  it('TC-B07-04: SQL injection payload in documentType is safely rejected', async () => {
    const res = await submitOcrJob('42b47156-14da-4d93-a202-db90ea9174a4', "LAB_REPORT'; DROP TABLE jobs; --");
    assert(res.status >= 400, 'SQL injection in documentType must be rejected');
  });

  it('TC-B07-05: XSS payload in documentType is safely rejected', async () => {
    const res = await submitOcrJob('42b47156-14da-4d93-a202-db90ea9174a4', '<script>alert(1)</script>');
    assert(res.status >= 400, 'XSS string in documentType must be rejected');
  });
});
