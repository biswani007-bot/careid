/**
 * Tier 3 — Cross-Feature 5: Multi-Format Batch Workflow
 * Tests sequential uploading of PNG, DICOM, and PDF documents, creating cross-format chart records.
 */

import { describe, it, assertEqual, assertDefined } from '../helpers/testUtils.ts';
import { uploadMultipartAttachment, createMedicalRecord } from '../helpers/apiHelper.ts';
import {
  createValidPngBuffer,
  createValidPdfBuffer,
  createValidJpegBuffer,
} from '../helpers/fixtures.ts';
import { TEST_PATIENT_ID } from '../helpers/authHelper.ts';

describe('Tier 3 — Cross-Feature 5: Multi-Format Batch Workflow', () => {
  it('TC-X05: Batch uploading PNG, JPEG radiology, and PDF attachments into a unified diagnostic record', async () => {
    // 1. Upload PNG attachment
    const png = createValidPngBuffer();
    const upPng = await uploadMultipartAttachment(png, 'batch_lab.png', 'image/png');
    assertEqual(upPng.status, 201, 'PNG upload must succeed');
    const attPng = upPng.body.data!;

    // 2. Upload Radiology image scan attachment
    const jpg = createValidJpegBuffer();
    const upJpg = await uploadMultipartAttachment(jpg, 'batch_scan.jpg', 'image/jpeg', { category: 'RADIOLOGY' });
    assertEqual(upJpg.status, 201, 'Radiology scan upload must succeed');
    const attJpg = upJpg.body.data!;

    // 3. Upload Multi-Page PDF attachment
    const pdf = createValidPdfBuffer(2, 'Batch Multi-Page Pathology');
    const upPdf = await uploadMultipartAttachment(pdf, 'batch_pathology.pdf', 'application/pdf');
    assertEqual(upPdf.status, 201, 'PDF upload must succeed');
    const attPdf = upPdf.body.data!;

    // 4. Create composite diagnostic record linking all 3 multi-format attachments
    const compositeTitle = `Composite Multi-Modal Panel - ${Date.now()}`;
    const payload = {
      title: compositeTitle,
      chiefComplaint: 'Multi-modal diagnostic review',
      clinicalNotes: 'Unified record combining laboratory scan, radiology imaging, and pathology PDF.',
      status: 'FINAL',
      attachments: [
        {
          fileName: attPng.fileName,
          originalName: attPng.originalName,
          fileSize: attPng.fileSize,
          mimeType: attPng.mimeType,
          storageUrl: attPng.storageUrl,
          category: 'LAB_RESULT',
        },
        {
          fileName: attJpg.fileName,
          originalName: attJpg.originalName,
          fileSize: attJpg.fileSize,
          mimeType: attJpg.mimeType,
          storageUrl: attJpg.storageUrl,
          category: 'RADIOLOGY',
        },
        {
          fileName: attPdf.fileName,
          originalName: attPdf.originalName,
          fileSize: attPdf.fileSize,
          mimeType: attPdf.mimeType,
          storageUrl: attPdf.storageUrl,
          category: 'PATHOLOGY',
        },
      ],
    };

    const res = await createMedicalRecord(TEST_PATIENT_ID, payload);
    assertEqual(res.status, 201, 'Composite record creation must return 201 Created');
    assertDefined(res.body.data, 'Composite record data must be returned');
  });
});
