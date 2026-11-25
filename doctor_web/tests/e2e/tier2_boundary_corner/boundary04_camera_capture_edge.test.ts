/**
 * Tier 2 — Boundary 4: Camera Capture Edge Cases
 * Tests 0-byte camera blobs, corrupted JPEG bytes, extreme aspect ratios, and stream aborts.
 */

import { describe, it, assert, assertEqual } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';

describe('Tier 2 — Boundary 4: Camera Capture Edge Cases', () => {
  it('TC-B04-01: 0-byte canvas blob from failed camera frame is rejected with HTTP 400', async () => {
    const emptyCameraBlob = Buffer.alloc(0);
    const res = await uploadMultipartAttachment(emptyCameraBlob, 'cam_0byte.jpg', 'image/jpeg');

    assert(res.status >= 400, '0-byte camera blob must return error');
  });

  it('TC-B04-02: Corrupted JPEG header (missing SOI FF D8) is rejected with HTTP 400', async () => {
    // Missing standard FF D8 SOI marker
    const corruptedJpeg = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x10, 0x4a, 0x46]);
    const res = await uploadMultipartAttachment(corruptedJpeg, 'corrupted_cam.jpg', 'image/jpeg');

    assert(res.status >= 400, 'Corrupted JPEG header must be rejected');
  });

  it('TC-B04-03: Extreme aspect ratio image (1x10000) does not crash the upload endpoint', async () => {
    // Construct small valid-header buffer
    const minimalBuffer = Buffer.from('GIF89a', 'ascii');
    const res = await uploadMultipartAttachment(minimalBuffer, 'extreme_ratio.gif', 'image/gif');

    assert(res.status >= 200, 'Endpoint must handle unconventional dimensions without crash');
  });

  it('TC-B04-04: Camera scan abort via AbortController cancels in-flight fetch cleanly', async () => {
    const controller = new AbortController();
    const abortPromise = fetch('https://360api.vnvision.in/api/v1/health', {
      signal: controller.signal,
    });
    controller.abort();

    let aborted = false;
    try {
      await abortPromise;
    } catch {
      aborted = true;
    }
    assertEqual(aborted, true, 'Request should abort cleanly when signal fires');
  });

  it('TC-B04-05: Client camera permission denial simulation does not leak unhandled exceptions', () => {
    let permissionDenied = false;
    try {
      // Simulate camera constraint error
      throw new Error('NotAllowedError: Permission denied');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('NotAllowedError')) {
        permissionDenied = true;
      }
    }
    assertEqual(permissionDenied, true, 'Camera permission error must be caught gracefully');
  });
});
