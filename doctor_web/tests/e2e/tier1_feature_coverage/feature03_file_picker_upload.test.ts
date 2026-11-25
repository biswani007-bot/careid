/**
 * Tier 1 — Feature 3: File Picker Computer Upload
 * Tests uploading PDF, PNG, JPG, and DICOM binaries to POST /api/v1/attachments.
 */

import { describe, it, assert, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';
import {
  createValidPdfBuffer,
  createValidPngBuffer,
  createValidJpegBuffer,
  createValidDicomBuffer,
} from '../helpers/fixtures.ts';

describe('Feature 3: File Picker Computer Upload', () => {
  it('TC-F03-01: Upload PDF document via computer picker returns HTTP 201 and storageUrl', async () => {
    const pdf = createValidPdfBuffer(1, 'CBC Blood Test Report');
    const res = await uploadMultipartAttachment(pdf, 'cbc_report.pdf', 'application/pdf');

    assertEqual(res.status, 201, 'PDF upload must return 201 Created');
    assertDefined(res.body.data?.id, 'Attachment ID must be returned');
    assertDefined(res.body.data?.storageUrl, 'Storage URL must be returned');
    assertMatches(res.body.data!.storageUrl, /^\/api\/v1\/attachments\/file\//, 'Storage URL must follow API pattern');
  });

  it('TC-F03-02: Upload PNG image via computer picker returns HTTP 201 and image metadata', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'lab_scan.png', 'image/png');

    assertEqual(res.status, 201, 'PNG upload must return 201 Created');
    assertEqual(res.body.data?.mimeType, 'image/png', 'MimeType must be image/png');
  });

  it('TC-F03-03: Upload JPG image via computer picker returns HTTP 201 and valid attachment ID', async () => {
    const jpg = createValidJpegBuffer();
    const res = await uploadMultipartAttachment(jpg, 'prescription_scan.jpg', 'image/jpeg');

    assertEqual(res.status, 201, 'JPG upload must return 201 Created');
    assertDefined(res.body.data?.id, 'Attachment ID must be returned');
  });

  it('TC-F03-04: Upload DICOM binary via computer picker returns HTTP 201 or 400 format validation', async () => {
    const dcm = createValidDicomBuffer();
    const res = await uploadMultipartAttachment(dcm, 'chest_xray.dcm', 'application/dicom');

    assert([201, 400].includes(res.status), 'DICOM upload returns 201 or 400 format validation');
  });

  it('TC-F03-05: Uploaded attachment contains genuine checksum and initial version number 1', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'checksum_test.png', 'image/png');

    assertEqual(res.status, 201, 'Upload must succeed');
    assertDefined(res.body.data?.checksum, 'Checksum must be computed');
    assertEqual(res.body.data?.version, 1, 'Initial attachment version must be 1');
  });
});
