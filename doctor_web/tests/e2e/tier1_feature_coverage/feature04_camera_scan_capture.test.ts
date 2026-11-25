/**
 * Tier 1 — Feature 4: Camera Scan Document Capture
 * Tests camera capture conversion to binary and upload to POST /api/v1/attachments.
 */

import { describe, it, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';
import { createValidJpegBuffer } from '../helpers/fixtures.ts';
import { BASE_URL, getAuthHeaders, TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 4: Camera Scan Document Capture', () => {
  it('TC-F04-01: Converted camera frame blob uploads as authentic binary returning 201 Created', async () => {
    const cameraBuffer = createValidJpegBuffer();
    const cameraFilename = `camera_scan_${Date.now()}.jpg`;
    const res = await uploadMultipartAttachment(cameraBuffer, cameraFilename, 'image/jpeg');

    assertEqual(res.status, 201, 'Camera scan upload must return 201 Created');
    assertDefined(res.body.data?.id, 'Camera scan attachment ID must be returned');
  });

  it('TC-F04-02: Camera scan upload preserves JPEG mimeType and camera-generated filename', async () => {
    const cameraBuffer = createValidJpegBuffer();
    const cameraFilename = `careid_cam_capture_${Date.now()}.jpg`;
    const res = await uploadMultipartAttachment(cameraBuffer, cameraFilename, 'image/jpeg');

    assertEqual(res.body.data?.mimeType, 'image/jpeg', 'MimeType must be image/jpeg');
    assertEqual(res.body.data?.originalName, cameraFilename, 'Original filename must match camera capture name');
  });

  it('TC-F04-03: Camera scan generates authentic storageKey under attachments prefix', async () => {
    const cameraBuffer = createValidJpegBuffer();
    const res = await uploadMultipartAttachment(cameraBuffer, 'camera_doc.jpg', 'image/jpeg');

    assertDefined(res.body.data?.storageKey, 'Storage key must be present');
    assertMatches(res.body.data!.storageKey, /^attachments\//, 'Storage key must be under attachments/ directory');
  });

  it('TC-F04-04: Camera scan attachment file is streamable via GET /api/v1/attachments/file/:filename', async () => {
    const cameraBuffer = createValidJpegBuffer();
    const uploadRes = await uploadMultipartAttachment(cameraBuffer, 'camera_verify.jpg', 'image/jpeg');
    const fileName = uploadRes.body.data!.fileName;

    const headers = await getAuthHeaders();
    const getRes = await fetch(`${BASE_URL}/attachments/file/${encodeURIComponent(fileName)}`, { headers });
    assertEqual(getRes.status, 200, 'GET /attachments/file/:filename must return 200 OK');
    const arrayBuffer = await getRes.arrayBuffer();
    assertEqual(arrayBuffer.byteLength, cameraBuffer.length, 'Streamed bytes must match uploaded file size');
  });

  it('TC-F04-05: Camera scan attachment binds to active patient profile ID', async () => {
    const cameraBuffer = createValidJpegBuffer();
    const res = await uploadMultipartAttachment(cameraBuffer, 'camera_patient.jpg', 'image/jpeg', {
      patientProfileId: TEST_PATIENT_ID,
    });

    assertEqual(res.body.data?.patientProfileId, TEST_PATIENT_ID, 'Patient ID must match target patient');
  });
});
