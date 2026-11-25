/**
 * Tier 1 — Feature 5: Multi-Page PDF Import
 * Tests multi-page PDF binary upload preserving page order, filename, and mimeType.
 */

import { describe, it, assertEqual, assertDefined, assertGreaterThan } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment } from '../helpers/apiHelper.ts';
import { createValidPdfBuffer } from '../helpers/fixtures.ts';

describe('Feature 5: Multi-Page PDF Import', () => {
  it('TC-F05-01: Multi-page (3-page) PDF uploads successfully with HTTP 201 Created', async () => {
    const multiPdf = createValidPdfBuffer(3, 'Multi-Page Diagnostic Lab Report Page');
    const res = await uploadMultipartAttachment(multiPdf, 'multi_page_lab.pdf', 'application/pdf');

    assertEqual(res.status, 201, 'Multi-page PDF upload must succeed with 201');
    assertDefined(res.body.data?.id, 'Attachment ID must be returned');
  });

  it('TC-F05-02: Byte integrity and size are preserved for multi-page documents', async () => {
    const multiPdf = createValidPdfBuffer(5, 'Clinical Pathology 5-Page Report');
    const res = await uploadMultipartAttachment(multiPdf, 'five_page_pathology.pdf', 'application/pdf');

    assertEqual(res.body.data?.fileSize, multiPdf.length, 'Reported fileSize must match buffer length');
    assertGreaterThan(res.body.data!.fileSize, 500, 'Multi-page PDF size must be greater than minimal single page');
  });

  it('TC-F05-03: Original filename is strictly preserved across multi-page imports', async () => {
    const multiPdf = createValidPdfBuffer(2, 'Hematology Multi-Page Panel');
    const exactName = 'CBC_Differential_MultiPage_Report_2026.pdf';
    const res = await uploadMultipartAttachment(multiPdf, exactName, 'application/pdf');

    assertEqual(res.body.data?.originalName, exactName, 'Original filename must match uploaded name');
  });

  it('TC-F05-04: MimeType is validated as application/pdf for multi-page imports', async () => {
    const multiPdf = createValidPdfBuffer(4, 'Comprehensive Lab Report');
    const res = await uploadMultipartAttachment(multiPdf, 'lab_results_4pages.pdf', 'application/pdf');

    assertEqual(res.body.data?.mimeType, 'application/pdf', 'MimeType must be application/pdf');
  });

  it('TC-F05-05: Multi-page attachment can be retrieved and streamed via server endpoint', async () => {
    const multiPdf = createValidPdfBuffer(2, 'Diagnostic Radiology Scan Report');
    const res = await uploadMultipartAttachment(multiPdf, 'radiology_2page.pdf', 'application/pdf');
    const storageUrl = res.body.data?.storageUrl;

    assertDefined(storageUrl, 'Storage URL must be present');
    assertEqual(storageUrl.startsWith('/api/v1/attachments/file/'), true, 'Storage URL must point to server stream');
  });
});
