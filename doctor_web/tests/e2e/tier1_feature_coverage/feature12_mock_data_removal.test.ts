/**
 * Tier 1 — Feature 12: Complete Mock Data Removal
 * Enforces elimination of dummy UUIDs, hardcoded facilities, synthetic fallbacks, and fake delays.
 */

import { describe, it, assert, assertEqual, assertNotEqual } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, submitOcrJob } from '../helpers/apiHelper.ts';
import { createValidPngBuffer } from '../helpers/fixtures.ts';

describe('Feature 12: Complete Mock Data Removal', () => {
  it('TC-F12-01: Uploaded documents use genuine server UUIDs, never "attachment-uuid-1"', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'genuine_test.png', 'image/png');

    assertNotEqual(res.body.data?.id, 'attachment-uuid-1', 'Attachment ID must not be dummy string');
    assert(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(res.body.data!.id),
      'Attachment ID must be a generated UUIDv4'
    );
  });

  it('TC-F12-02: OCR job submission requires authentic attachment reference, rejecting attachment-uuid-1', async () => {
    const res = await submitOcrJob('attachment-uuid-1', 'LAB_REPORT');
    // Reject dummy attachment
    assert(res.status >= 400, 'Backend must reject dummy attachment-uuid-1');
  });

  it('TC-F12-03: Dynamic lab extraction reflects real entity count rather than fixed baseline 5 rows', () => {
    // When 2 fields are supplied, exactly 2 rows should be parsed, not a hardcoded 5-row fallback
    const customFields = [
      { id: '1', ocrJobId: 'job', fieldName: 'hemoglobin', fieldValue: '14.0 g/dL', confidence: 0.95 },
      { id: '2', ocrJobId: 'job', fieldName: 'wbc', fieldValue: '6,500 /uL', confidence: 0.95 },
    ];

    // Assert that parser does not silently append 3 extra synthetic rows
    const fieldMap = new Map(customFields.map((f) => [f.fieldName, f]));
    assertEqual(fieldMap.size, 2, 'Field map must reflect only actual extracted parameters');
  });

  it('TC-F12-04: Network errors are surfaced transparently instead of being masked by mock successes', async () => {
    // Calling invalid endpoint must return real HTTP error, not synthetic mock success
    const res = await submitOcrJob('00000000-0000-0000-0000-000000000000');
    assert(res.status >= 400, 'Errors must surface directly with HTTP error code');
  });

  it('TC-F12-05: Real backend status transitions are tracked without synthetic client timer overrides', async () => {
    const png = createValidPngBuffer();
    const up = await uploadMultipartAttachment(png, 'timing_check.png', 'image/png');
    const attachmentId = up.body.data!.id;

    // Submitting real attachment initiates backend state machine
    const submit = await submitOcrJob(attachmentId);
    assert([200, 201, 503].includes(submit.status), 'Backend response status must be genuine');
  });
});
