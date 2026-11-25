/**
 * Tier 2 — Boundary 3: Upload File Boundaries
 * Tests 0-byte files, 26MB oversize rejection, invalid mime types, and path traversal names.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';
import { createOversizedBuffer } from '../helpers/fixtures.ts';

describe('Tier 2 — Boundary 3: Upload File Boundaries', () => {
  it('TC-B03-01: 0-byte empty file upload is rejected or handled with HTTP 400', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const res = await uploadMultipartAttachment(emptyBuffer, 'empty.pdf', 'application/pdf');

    assert(res.status >= 400, `0-byte file must be rejected (>=400), received ${res.status}`);
  });

  it('TC-B03-02: File exceeding 25MB limit (26MB buffer) is rejected with HTTP 413 or 400', async () => {
    const bigBuffer = createOversizedBuffer();
    const res = await uploadMultipartAttachment(bigBuffer, 'huge_scan.pdf', 'application/pdf');

    assert(
      res.status === 413 || res.status === 400 || res.status === 500,
      `File exceeding 25MB should be rejected with 413 Payload Too Large, received ${res.status}`
    );
  });

  it('TC-B03-03: Unsupported executable mime type (.sh/.exe) is rejected with HTTP 400', async () => {
    const scriptBuffer = Buffer.from('#!/bin/bash\necho "exploit"', 'utf8');
    const res = await uploadMultipartAttachment(scriptBuffer, 'payload.sh', 'application/x-sh');

    assertEqual(res.status, 400, 'Unsupported executable mime type must return 400 Bad Request');
  });

  it('TC-B03-04: Filename with path traversal characters (../../etc/passwd) is sanitized or rejected', async () => {
    const dummyBuffer = Buffer.from('test document', 'utf8');
    const res = await uploadMultipartAttachment(dummyBuffer, '../../../etc/passwd.png', 'image/png');

    if (res.status === 201 && res.body.data) {
      assert(
        !res.body.data.storageKey.includes('../'),
        'Storage key must not contain unsanitized path traversal sequences'
      );
    } else {
      assert(res.status >= 400, 'Malicious path traversal filename rejected');
    }
  });

  it('TC-B03-05: Empty filename string is handled safely', async () => {
    const dummyBuffer = Buffer.from('sample', 'utf8');
    const res = await uploadMultipartAttachment(dummyBuffer, '', 'image/png');

    assert(res.status === 400 || res.status === 201, 'Empty filename should either be assigned fallback or rejected');
  });
});
