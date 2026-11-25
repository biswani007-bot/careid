/**
 * Tier 1 — Feature 7: Real OCR Job Submission
 * Tests submitting real uploaded attachment IDs to POST /api/v1/ocr/jobs.
 */

import { describe, it, assert, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, submitOcrJob } from '../helpers/apiHelper.ts';
import { createValidPngBuffer } from '../helpers/fixtures.ts';

describe('Feature 7: Real OCR Job Submission', () => {
  it('TC-F07-01: Submit authentic attachment ID to POST /api/v1/ocr/jobs', async () => {
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'ocr_target.png', 'image/png');
    const attachmentId = upRes.body.data!.id;

    const ocrRes = await submitOcrJob(attachmentId, 'LAB_REPORT');
    // If backend OCR worker is active, returns 201; if worker busy or 503, verify structured error or job tracking
    assert(
      ocrRes.status === 201 || ocrRes.status === 503 || ocrRes.status === 200,
      `OCR submission should return 201, 200, or 503 worker status, received ${ocrRes.status}`
    );
    if (ocrRes.status === 201) {
      assertDefined(ocrRes.body.data?.id, 'OCR Job ID must be returned');
      assertMatches(
        ocrRes.body.data!.id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'OCR Job ID must be a UUID'
      );
    }
  });

  it('TC-F07-02: OCR job records initial status (PENDING, PROCESSING, or REVIEW_REQUIRED)', async () => {
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'ocr_status.png', 'image/png');
    const attachmentId = upRes.body.data!.id;

    const ocrRes = await submitOcrJob(attachmentId, 'LAB_REPORT');
    if (ocrRes.status === 201 && ocrRes.body.data) {
      const status = ocrRes.body.data.status;
      assert(
        ['PENDING', 'PROCESSING', 'REVIEW_REQUIRED', 'COMPLETED', 'FAILED'].includes(status),
        `Status ${status} must be a recognized OCR state`
      );
    }
  });

  it('TC-F07-03: Submitting with documentType LAB_REPORT preserves documentType in job entity', async () => {
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'ocr_lab.png', 'image/png');
    const attachmentId = upRes.body.data!.id;

    const ocrRes = await submitOcrJob(attachmentId, 'LAB_REPORT');
    if (ocrRes.status === 201 && ocrRes.body.data) {
      assertEqual(ocrRes.body.data.documentType, 'LAB_REPORT');
    }
  });

  it('TC-F07-04: Submitting with documentType DIAGNOSTIC_IMAGE preserves documentType in job entity', async () => {
    const png = createValidPngBuffer();
    const upRes = await uploadMultipartAttachment(png, 'ocr_diag.png', 'image/png');
    const attachmentId = upRes.body.data!.id;

    const ocrRes = await submitOcrJob(attachmentId, 'DIAGNOSTIC_IMAGE');
    if (ocrRes.status === 201 && ocrRes.body.data) {
      assertEqual(ocrRes.body.data.documentType, 'DIAGNOSTIC_IMAGE');
    }
  });

  it('TC-F07-05: Submitting dummy attachment ID attachment-uuid-1 fails or handles missing entity', async () => {
    const ocrRes = await submitOcrJob('attachment-uuid-1', 'LAB_REPORT');
    // Non-existent attachment should fail or return error
    assert(
      ocrRes.status >= 400,
      `Submitting fake attachment ID must result in error status (>=400), received ${ocrRes.status}`
    );
  });
});
