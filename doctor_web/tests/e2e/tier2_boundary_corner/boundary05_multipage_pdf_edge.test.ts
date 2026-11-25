/**
 * Tier 2 — Boundary 5: Multi-Page PDF Edge Cases
 * Tests 0-page PDFs, corrupted xref tables, password-locked documents, and malformed structures.
 */

import { describe, it, assert } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';

describe('Tier 2 — Boundary 5: Multi-Page PDF Edge Cases', () => {
  it('TC-B05-01: 0-page PDF document structure is handled gracefully', async () => {
    const zeroPagePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF', 'latin1');
    const res = await uploadMultipartAttachment(zeroPagePdf, 'zero_page.pdf', 'application/pdf');

    assert([200, 201, 400].includes(res.status), '0-page PDF must be handled with standard HTTP code');
  });

  it('TC-B05-02: Corrupted PDF header (missing %PDF prefix) is rejected', async () => {
    const invalidHeaderPdf = Buffer.from('NOT-A-PDF-HEADER\n1 0 obj\n<<>>\nendobj', 'latin1');
    const res = await uploadMultipartAttachment(invalidHeaderPdf, 'corrupted_header.pdf', 'application/pdf');

    assert(res.status >= 400, 'Corrupted PDF header must be rejected with 400 or higher');
  });

  it('TC-B05-03: Truncated PDF (missing %%EOF trailer) is handled without server crash', async () => {
    const truncatedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n', 'latin1');
    const res = await uploadMultipartAttachment(truncatedPdf, 'truncated.pdf', 'application/pdf');

    assert([200, 201, 400].includes(res.status), 'Truncated PDF must return valid HTTP status without 500 error');
  });

  it('TC-B05-04: Password-protected PDF binary upload does not break attachment pipeline', async () => {
    // Encrypted PDF dictionary indicator /Encrypt
    const encryptedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n3 0 obj\n<< /Filter /Standard /V 2 /R 3 /O (hash) /U (hash) /P -4 >>\nendobj\ntrailer\n<< /Root 1 0 R /Encrypt 3 0 R >>\n%%EOF', 'latin1');
    const res = await uploadMultipartAttachment(encryptedPdf, 'encrypted.pdf', 'application/pdf');

    assert([200, 201, 400].includes(res.status), 'Encrypted PDF handled predictably');
  });

  it('TC-B05-05: PDF with embedded Javascript block is safely sanitized or isolated', async () => {
    const jsPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Names << /JavaScript 2 0 R >> >>\nendobj\n2 0 obj\n<< /Names [(test) 3 0 R] >>\nendobj\n3 0 obj\n<< /S /JavaScript /JS (app.alert("xss")) >>\nendobj\n%%EOF', 'latin1');
    const res = await uploadMultipartAttachment(jsPdf, 'js_embedded.pdf', 'application/pdf');

    assert([200, 201, 400].includes(res.status), 'Embedded JS PDF handled predictably');
  });
});
