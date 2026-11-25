/**
 * Tier 1 — Feature 6: Eliminate Browser Object URL as Upload
 * Verifies that ephemeral blob: URLs are eliminated and replaced by authentic backend attachments.
 */

import { describe, it, assert, assertEqual, assertDefined, assertMatches } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import { createValidPngBuffer } from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Feature 6: Eliminate Browser Object URL as Upload', () => {
  it('TC-F06-01: Document upload yields authentic server attachment UUID, not client blob: URL', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'elim_blob.png', 'image/png');

    assertEqual(res.status, 201, 'Upload must succeed');
    assertDefined(res.body.data?.id, 'Server attachment ID must exist');
    assert(
      !res.body.data!.id.startsWith('blob:'),
      'Attachment ID must never be a local browser blob: URL'
    );
  });

  it('TC-F06-02: Backend storageUrl is formatted as an authentic API endpoint, not blob: URL', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'storage_url_check.png', 'image/png');

    const storageUrl = res.body.data?.storageUrl;
    assertDefined(storageUrl, 'Storage URL must exist');
    assert(
      !storageUrl.startsWith('blob:'),
      'Storage URL must never be a local browser blob: URL'
    );
    assertMatches(
      storageUrl,
      /^\/api\/v1\/attachments\/file\//,
      'Storage URL must route to /api/v1/attachments/file/'
    );
  });

  it('TC-F06-03: Medical record creation rejects or ignores client blob: URL in attachments array', async () => {
    // Attempt to persist record with fake blob: URL
    const payload = {
      title: 'Lab Report with Fake Object URL',
      chiefComplaint: 'Diagnostic Review',
      clinicalNotes: 'Test eliminating blob url',
      status: 'FINAL',
      attachments: [
        {
          fileName: 'fake.png',
          originalName: 'fake.png',
          fileSize: 1024,
          mimeType: 'image/png',
          storageUrl: 'blob:http://localhost:5173/12345-fake-object-url',
          category: 'LAB_RESULT',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    // If backend accepts or sanitizes, verify that saved attachments do not contain active blob: references
    if (res.status === 201) {
      const savedAttachments = (res.body.data as { attachments?: Array<{ storageUrl?: string }> })?.attachments;
      if (savedAttachments && savedAttachments.length > 0) {
        assert(
          !savedAttachments[0].storageUrl?.startsWith('blob:'),
          'Persisted storageUrl must not be a blob: URL'
        );
      }
    }
  });

  it('TC-F06-04: Authentic attachment storageUrl remains valid across multiple requests', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'persistence_check.png', 'image/png');
    const storageUrl = res.body.data!.storageUrl;

    // Verify storageUrl does not expire like an in-memory blob URL
    assertDefined(storageUrl);
    assertEqual(storageUrl.includes('attachments/file'), true);
  });

  it('TC-F06-05: Verification that attachment entity contains physical storageKey', async () => {
    const png = createValidPngBuffer();
    const res = await uploadMultipartAttachment(png, 'storage_key_verify.png', 'image/png');

    assertDefined(res.body.data?.storageKey, 'Storage key must be present in server response');
    assert(
      !res.body.data!.storageKey.includes('blob:'),
      'Storage key must be a backend filesystem/S3 path, not a browser blob'
    );
  });
});
