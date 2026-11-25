/**
 * Tier 1 — Feature 1: Multipart FormData HTTP Client
 * Validates binary multipart upload, boundary calculation, auth injection, and metadata preservation.
 */

import { describe, it, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';
import { createValidPngBuffer } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 1: Multipart FormData HTTP Client', () => {
  it('TC-F01-01: Multipart binary payload upload transmits with HTTP 201 and authentic attachment UUID', async () => {
    const png = createValidPngBuffer();
    const filename = `f01_test_${Date.now()}.png`;
    const res = await uploadMultipartAttachment(png, filename, 'image/png');

    assertEqual(res.status, 201, 'Upload must succeed with HTTP 201 Created');
    assertDefined(res.body.data, 'Response must contain data payload');
    assertDefined(res.body.data.id, 'Attachment ID must be present');
    assertMatches(
      res.body.data.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'Attachment ID must be a valid UUID'
    );
  });

  it('TC-F01-02: Content-Type boundary is dynamically computed without rigid application/json override', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'boundary_check.png', 'image/png');

    assertEqual(res.status, 201, 'Endpoint must parse multipart boundary successfully');
    assertEqual(res.body.data?.mimeType, 'image/png', 'MimeType should be parsed as image/png');
  });

  it('TC-F01-03: Authorization Bearer header is verified during multipart transmission', async () => {
    const png = createValidPngBuffer();
    // Intentionally pass an invalid token to verify auth rejection
    const res = await uploadMultipartAttachment(png, 'unauth.png', 'image/png', {
      token: 'invalid_expired_bearer_token',
    });

    assertEqual(res.status, 401, 'Multipart request with invalid token must return 401 Unauthorized');
  });

  it('TC-F01-04: Original filename and size are preserved exactly by the backend', async () => {
    const png = createValidPngBuffer();
    const exactName = `patient_scan_${Date.now()}_alpha.png`;
    const res = await uploadMultipartAttachment(png, exactName, 'image/png');

    assertEqual(res.status, 201, 'Upload status must be 201');
    assertEqual(res.body.data?.originalName, exactName, 'Original filename must be preserved');
    assertEqual(res.body.data?.fileSize, png.length, 'File size must match transmitted buffer length');
  });

  it('TC-F01-05: Associated metadata fields (category, patientProfileId) persist into attachment entity', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'metadata_test.png', 'image/png', {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    assertEqual(res.status, 201, 'Upload must succeed with status 201');
    assertEqual(res.body.data?.category, 'LAB_RESULT', 'Category must match LAB_RESULT');
    assertEqual(res.body.data?.patientProfileId, TEST_PATIENT_ID, 'Patient profile ID must match target patient');
  });
});
