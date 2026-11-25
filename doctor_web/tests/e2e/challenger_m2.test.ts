/**
 * Empirical Challenger 2 - Milestone 2 Forensic Integrity Test Harness
 * Stress-tests attachmentService and document upload integrity against live backend https://360api.vnvision.in
 */

// Set up browser-like environment for Node
const storage = new Map<string, string>();
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { getDoctorToken, TEST_PATIENT_ID, BASE_URL, getAuthHeaders } from './helpers/authHelper.ts';
import {
  createValidPdfBuffer,
  createValidJpegBuffer,
  createValidPngBuffer,
} from './helpers/fixtures.ts';
import {
  attachmentService,
  validateAttachmentFile,
  ALLOWED_ATTACHMENT_EXTENSIONS,
} from '../../src/services/attachmentService.ts';
import fs from 'node:fs';
import path from 'node:path';

interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

async function runTest(name: string, fn: () => Promise<void>) {
  stats.total++;
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`  ✔ PASS [${duration}ms] ${name}`);
    stats.passed++;
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✖ FAIL [${duration}ms] ${name}: ${msg}`);
    stats.failed++;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log(' EMPIRICAL CHALLENGER 2 — MILESTONE 2 FORENSIC INTEGRITY AUDIT');
  console.log(' Live Target Backend: https://360api.vnvision.in');
  console.log('='.repeat(80));

  // Step 0: Warm doctor session
  console.log('\n[Phase 0] Acquiring authentic doctor session token...');
  const token = await getDoctorToken();
  sessionStorage.setItem('careid_access_token', token);
  console.log(`[Phase 0] Doctor session established. Token length: ${token.length}`);

  // =========================================================================
  // SUITE 1: Static Code Integrity Audit
  // =========================================================================
  console.log('\n▶ Suite 1: Static Source Code Integrity Forensics');

  await runTest('SC01: No dummy attachment-uuid-1 in MedicalRecordUploadPage or services', async () => {
    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/ocr/MedicalRecordUploadPage.tsx'),
      'utf-8'
    );
    const serviceContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/attachmentService.ts'),
      'utf-8'
    );

    if (pageContent.includes('attachment-uuid-1')) {
      throw new Error('Found hardcoded dummy "attachment-uuid-1" in MedicalRecordUploadPage.tsx');
    }
    if (serviceContent.includes('attachment-uuid-1')) {
      throw new Error('Found hardcoded dummy "attachment-uuid-1" in attachmentService.ts');
    }
  });

  await runTest('SC02: Medical record creation storageUrl strictly excludes blob: URLs', async () => {
    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/ocr/MedicalRecordUploadPage.tsx'),
      'utf-8'
    );
    // Verify storageUrl logic
    if (pageContent.includes('storageUrl: uploadedFile.previewUrl')) {
      throw new Error('MedicalRecordUploadPage transmits previewUrl directly as storageUrl');
    }
    if (!pageContent.includes("!uploadedFile.storageUrl.startsWith('blob:')")) {
      throw new Error('Missing defensive exclusion of blob: URLs in storageUrl assignment');
    }
  });

  await runTest('SC03: No fake upload setInterval or setTimeout progress hacks', async () => {
    const pageContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/ocr/MedicalRecordUploadPage.tsx'),
      'utf-8'
    );
    const serviceContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/attachmentService.ts'),
      'utf-8'
    );

    if (serviceContent.includes('setInterval') || serviceContent.includes('setTimeout')) {
      throw new Error('attachmentService contains timer functions');
    }

    // Check processSelectedFile for setInterval or setTimeout
    const processFileMatch = pageContent.match(/const processSelectedFile = async[\s\S]*?^ {2}\};/m);
    if (processFileMatch && (processFileMatch[0].includes('setInterval') || processFileMatch[0].includes('setTimeout'))) {
      throw new Error('processSelectedFile uses timer functions to simulate upload progress');
    }
  });

  // =========================================================================
  // SUITE 2: Client Pre-Flight Validation Logic
  // =========================================================================
  console.log('\n▶ Suite 2: Client-Side Pre-Flight Validation');

  await runTest('VAL01: 0-byte file is rejected', async () => {
    const emptyBlob = new Blob([], { type: 'application/pdf' });
    const res = validateAttachmentFile(emptyBlob, 'empty.pdf');
    if (res.isValid) throw new Error('Expected 0-byte file to be invalid');
    if (!res.error?.includes('empty')) throw new Error(`Unexpected error message: ${res.error}`);
  });

  await runTest('VAL02: File exceeding 25MB threshold is rejected', async () => {
    const dummyBlob = { size: 26 * 1024 * 1024 } as unknown as Blob;
    const res = validateAttachmentFile(dummyBlob, 'large.pdf');
    if (res.isValid) throw new Error('Expected 26MB file to be invalid');
    if (!res.error?.includes('exceeds the maximum allowed limit of 25 MB')) {
      throw new Error(`Unexpected error message: ${res.error}`);
    }
  });

  await runTest('VAL03: Unsupported executable extension (.exe, .sh) is rejected', async () => {
    const blob = new Blob(['sample content'], { type: 'application/x-msdownload' });
    const res = validateAttachmentFile(blob, 'malware.exe');
    if (res.isValid) throw new Error('Expected .exe file to be invalid');
    if (!res.error?.includes('Unsupported file format')) {
      throw new Error(`Unexpected error message: ${res.error}`);
    }
  });

  await runTest('VAL04: Permitted extensions (.pdf, .jpg, .jpeg, .png, .webp, .tiff, .dcm, .dicom) pass', async () => {
    const dummyBlob = new Blob(['valid content'], { type: 'application/pdf' });
    for (const ext of ALLOWED_ATTACHMENT_EXTENSIONS) {
      const res = validateAttachmentFile(dummyBlob, `document${ext}`);
      if (!res.isValid) throw new Error(`Extension ${ext} should be valid, got: ${res.error}`);
    }
  });

  // =========================================================================
  // SUITE 3: Authentic Live Binary Uploads
  // =========================================================================
  console.log('\n▶ Suite 3: Authentic Live Backend Binary Uploads');

  await runTest('UP01: Live PDF upload via attachmentService.uploadAttachment', async () => {
    const pdfBuf = createValidPdfBuffer(2, 'Empirical Challenger 2 Audit PDF');
    const pdfFile = new File([pdfBuf], 'challenger2_audit.pdf', { type: 'application/pdf' });

    const uploadRes = await attachmentService.uploadAttachment(pdfFile, {
      originalName: 'challenger2_audit.pdf',
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    if (!uploadRes.id || uploadRes.id.startsWith('blob:') || uploadRes.id === 'attachment-uuid-1') {
      throw new Error(`Invalid attachment id returned: ${uploadRes.id}`);
    }
    if (!uploadRes.storageUrl || uploadRes.storageUrl.startsWith('blob:')) {
      throw new Error(`Invalid storageUrl returned: ${uploadRes.storageUrl}`);
    }
    if (!uploadRes.storageUrl.startsWith('/api/v1/attachments/file/')) {
      throw new Error(`storageUrl must start with /api/v1/attachments/file/, got: ${uploadRes.storageUrl}`);
    }
    if (uploadRes.fileSize !== pdfBuf.length) {
      throw new Error(`fileSize mismatch: expected ${pdfBuf.length}, got ${uploadRes.fileSize}`);
    }
    if (uploadRes.mimeType !== 'application/pdf') {
      throw new Error(`mimeType mismatch: expected application/pdf, got ${uploadRes.mimeType}`);
    }
  });

  await runTest('UP02: Live Camera JPEG capture upload via attachmentService.uploadAttachment', async () => {
    const jpegBuf = createValidJpegBuffer();
    const jpegFile = new File([jpegBuf], `careid_cam_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });

    const uploadRes = await attachmentService.uploadAttachment(jpegFile, {
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    if (!uploadRes.id || uploadRes.id.startsWith('blob:') || uploadRes.id === 'attachment-uuid-1') {
      throw new Error(`Invalid camera capture attachment id: ${uploadRes.id}`);
    }
    if (!uploadRes.storageKey?.startsWith('attachments/')) {
      throw new Error(`storageKey should start with attachments/, got: ${uploadRes.storageKey}`);
    }
    if (uploadRes.mimeType !== 'image/jpeg') {
      throw new Error(`mimeType mismatch: expected image/jpeg, got ${uploadRes.mimeType}`);
    }
  });

  await runTest('UP03: Stream uploaded attachment bytes and verify exact byte length match', async () => {
    const pngBuf = createValidPngBuffer();
    const pngFile = new File([pngBuf], 'stream_test.png', { type: 'image/png' });

    const uploadRes = await attachmentService.uploadAttachment(pngFile, {
      patientProfileId: TEST_PATIENT_ID,
      category: 'LAB_RESULT',
    });
    const headers = await getAuthHeaders();
    const streamUrl = `${BASE_URL}/attachments/file/${encodeURIComponent(uploadRes.fileName)}`;
    const getRes = await fetch(streamUrl, { headers });

    if (getRes.status !== 200) {
      throw new Error(`Stream endpoint returned status ${getRes.status}`);
    }
    const downloadedBuf = Buffer.from(await getRes.arrayBuffer());
    if (downloadedBuf.length !== pngBuf.length) {
      throw new Error(`Streamed byte length mismatch: uploaded ${pngBuf.length}, downloaded ${downloadedBuf.length}`);
    }
  });

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log(` CHALLENGER 2 SUMMARY: ${stats.passed}/${stats.total} PASSED (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
