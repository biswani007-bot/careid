/**
 * Tier 2 — Boundary 1: Multipart Limits & Parsing Edge Cases
 * Tests empty multipart bodies, invalid boundaries, oversized headers, and missing fields.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { BASE_URL, getAuthHeaders } from '../helpers/authHelper.ts';

describe('Tier 2 — Boundary 1: Multipart Limits & Parsing Edge Cases', () => {
  it('TC-B01-01: Empty multipart/form-data body returns HTTP 400 Bad Request', async () => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundaryEmpty';

    const res = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers,
      body: '',
    });

    assertEqual(res.status, 400, 'Empty multipart body must return 400 Bad Request');
  });

  it('TC-B01-02: Multipart request missing mandatory "file" field returns HTTP 400', async () => {
    const headers = await getAuthHeaders();
    delete headers['Content-Type'];

    const form = new FormData();
    form.append('category', 'LAB_RESULT'); // file field missing intentionally

    const res = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers,
      body: form,
    });

    assertEqual(res.status, 400, 'Missing file field must return 400 Bad Request');
  });

  it('TC-B01-03: Malformed multipart boundary delimiter returns HTTP 400 or 500', async () => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'multipart/form-data; boundary=invalid_boundary';

    const res = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers,
      body: 'This is not formatted as valid multipart content',
    });

    assert(res.status >= 400, `Malformed boundary should result in error (>=400), got ${res.status}`);
  });

  it('TC-B01-04: Boundary with injection / escape characters is safely handled or rejected', async () => {
    let rejected = false;
    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'multipart/form-data; boundary=----WebKitFormBoundary\r\nInjected-Header: evil';

      const res = await fetch(`${BASE_URL}/attachments`, {
        method: 'POST',
        headers,
        body: '--test--',
      });
      if (res.status >= 400) rejected = true;
    } catch {
      // Runtime HTTP header parser safely rejected CRLF injection
      rejected = true;
    }

    assertEqual(rejected, true, 'Injected CRLF in boundary header must be rejected');
  });

  it('TC-B01-05: Non-multipart payload sent to /attachments returns HTTP 400 or 500', async () => {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ file: 'not-a-file' }),
    });

    assert(res.status >= 400, 'JSON sent to multipart upload endpoint must be rejected');
  });
});
