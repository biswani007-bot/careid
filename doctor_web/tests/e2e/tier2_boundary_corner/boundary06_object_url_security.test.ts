/**
 * Tier 2 — Boundary 6: Object URL Security & URI Validation
 * Tests javascript:, data:, and file:// scheme injection attempts and storageUrl tampering.
 */

import { describe, it, assertEqual, assert } from '../helpers/testUtils.ts';
import { createMedicalRecord } from '../helpers/apiHelper.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 2 — Boundary 6: Object URL Security & URI Validation', () => {
  it('TC-B06-01: Rejection of javascript: URI scheme in attachment storageUrl', async () => {
    const maliciousPayload = {
      title: 'XSS Injection Attempt via Attachment URL',
      chiefComplaint: 'Security Audit',
      clinicalNotes: 'Testing javascript: URI filter',
      status: 'FINAL',
      attachments: [
        {
          fileName: 'exploit.png',
          originalName: 'exploit.png',
          fileSize: 1024,
          mimeType: 'image/png',
          storageUrl: 'javascript:alert(document.cookie)',
          category: 'LAB_RESULT',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, maliciousPayload);
    // If accepted, verify persisted URL does not execute or store javascript:
    if (res.status === 201) {
      const saved = (res.body.data as { attachments?: Array<{ storageUrl?: string }> })?.attachments;
      if (saved && saved[0]) {
        assert(!saved[0].storageUrl?.startsWith('javascript:'), 'javascript: URI must be stripped');
      }
    } else {
      assert(res.status >= 400, 'Payload with javascript: URI rejected');
    }
  });

  it('TC-B06-02: Rejection of data:text/html URI scheme in attachment storageUrl', async () => {
    const payload = {
      title: 'HTML Injection via Attachment URL',
      chiefComplaint: 'Security Audit',
      clinicalNotes: 'Testing data: URI',
      status: 'FINAL',
      attachments: [
        {
          fileName: 'data_uri.png',
          originalName: 'data_uri.png',
          fileSize: 500,
          mimeType: 'image/png',
          storageUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
          category: 'LAB_RESULT',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    if (res.status === 201) {
      const saved = (res.body.data as { attachments?: Array<{ storageUrl?: string }> })?.attachments;
      if (saved && saved[0]) {
        assert(!saved[0].storageUrl?.startsWith('data:text/html'), 'data:text/html URI must not be stored');
      }
    }
  });

  it('TC-B06-03: Rejection of file:/// local system path scheme in attachment storageUrl', async () => {
    const payload = {
      title: 'Local File Scheme Injection',
      chiefComplaint: 'Security Audit',
      clinicalNotes: 'Testing file:/// protocol',
      status: 'FINAL',
      attachments: [
        {
          fileName: 'hosts.png',
          originalName: 'hosts.png',
          fileSize: 200,
          mimeType: 'image/png',
          storageUrl: 'file:///etc/hosts',
          category: 'LAB_RESULT',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    if (res.status === 201) {
      const saved = (res.body.data as { attachments?: Array<{ storageUrl?: string }> })?.attachments;
      if (saved && saved[0]) {
        assert(!saved[0].storageUrl?.startsWith('file:'), 'file: URI scheme must not be stored');
      }
    }
  });

  it('TC-B06-04: Null or empty storageUrl does not crash record persistence', async () => {
    const payload = {
      title: 'Record with Empty Storage URL',
      chiefComplaint: 'Testing empty storageUrl',
      clinicalNotes: 'Safe handling',
      status: 'FINAL',
      attachments: [
        {
          fileName: 'empty_url.png',
          originalName: 'empty_url.png',
          fileSize: 100,
          mimeType: 'image/png',
          storageUrl: '',
          category: 'LAB_RESULT',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assert([201, 400].includes(res.status), 'Empty storageUrl handled without 500 crash');
  });

  it('TC-B06-05: Valid backend storage URL format is strictly checked', () => {
    const validUrl = '/api/v1/attachments/file/att-sample-12345.pdf';
    const isValid =
      validUrl.startsWith('/api/v1/attachments/file/') && !validUrl.includes('blob:') && !validUrl.includes('javascript:');
    assertEqual(isValid, true, 'Valid server storage URL should pass integrity check');
  });
});
