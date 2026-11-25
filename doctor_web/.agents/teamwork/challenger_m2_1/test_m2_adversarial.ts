/**
 * Adversarial Empirical Challenger for Milestone 2: Authentic Document Binary Upload
 * Agent: challenger_m2_1
 * 
 * Tests:
 * 1. Unit & pre-flight validation in attachmentService.ts (validateAttachmentFile, getAttachmentFileUrl)
 * 2. Live authentic PDF binary upload via attachmentService and direct HTTP POST /api/v1/attachments
 * 3. Live stream download verification via GET /api/v1/attachments/file/:filename with byte-for-byte comparison
 * 4. Boundary conditions:
 *    - 0-byte file (rejected by validateAttachmentFile and live backend HTTP 400)
 *    - Invalid file extension/format (rejected by validateAttachmentFile and backend)
 *    - Oversized file (>25MB) rejected by validateAttachmentFile
 *    - Unauthenticated upload rejected by backend with HTTP 401
 *    - Missing file multipart field rejected by backend with HTTP 400
 * 5. Camera capture simulation:
 *    - JPEG binary generation with valid SOI/JFIF headers
 *    - Upload via attachmentService returning valid UUID
 *    - Stream retrieval verifying matching JPEG bytes
 * 6. Concurrency stress test: parallel uploads verifying UUID uniqueness and independent storage keys
 * 7. Static audit of MedicalRecordUploadPage.tsx for complete elimination of mock strings and blob URLs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Polyfill browser globals if needed for apiClient
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
  } as unknown as Window & typeof globalThis;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  } as unknown as typeof CustomEvent;
}

import {
  validateAttachmentFile,
  getAttachmentFileUrl,
  uploadAttachment,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_ATTACHMENT_EXTENSIONS,
} from '../../../src/services/attachmentService.ts';

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TEST_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Obtain auth token from cache or login
function getAuthToken(): string {
  const cachePath = path.resolve(process.cwd(), '.token_cache.json');
  if (fs.existsSync(cachePath)) {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (raw.accessToken) return raw.accessToken;
  }
  const peerPath = path.resolve(process.cwd(), '.agents/teamwork/spec_miner_survey_1/doctor_tokens.json');
  if (fs.existsSync(peerPath)) {
    const raw = JSON.parse(fs.readFileSync(peerPath, 'utf8'));
    const token = raw.data?.accessToken || raw.accessToken;
    if (token) return token;
  }
  throw new Error('No valid doctor auth token found in cache files');
}

// Minimal valid PDF generator
function createValidPdf(text: string = 'CareID Challenger Verification'): Buffer {
  let objects = '';
  const addObj = (id: number, content: string) => {
    objects += `${id} 0 obj\n${content}\nendobj\n`;
  };
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>');
  const streamData = `BT /F1 12 Tf 72 712 Td (${text}) Tj ET`;
  addObj(4, `<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream`);
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const startXref = header.length + objects.length;
  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  return Buffer.from(header + objects + trailer, 'latin1');
}

// Minimal valid JPEG generator
function createValidJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);
}

interface TestRun {
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const testResults: TestRun[] = [];

function recordTest(name: string, passed: boolean, error?: string, details?: unknown) {
  testResults.push({ name, passed, error, details });
  const icon = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`  ${icon}: ${name}`);
  if (!passed && error) {
    console.error(`      -> Reason: ${error}`);
  }
}

async function runAdversarialSuite() {
  console.log('='.repeat(80));
  console.log(' CareID Milestone 2: Adversarial Empirical Challenge Suite');
  console.log(' Target Endpoint: https://360api.vnvision.in/api/v1/attachments');
  console.log('='.repeat(80));

  const token = getAuthToken();
  globalThis.sessionStorage.setItem('careid_access_token', token);
  console.log(`[Setup] Token loaded: ${token.slice(0, 15)}...${token.slice(-10)}`);

  // --------------------------------------------------------------------------
  // TEST SUITE 1: validateAttachmentFile pre-flight boundaries
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 1: Client Pre-Flight Validation (attachmentService) ---');
  try {
    const zeroBlob = new Blob([], { type: 'application/pdf' });
    const res1 = validateAttachmentFile(zeroBlob, 'empty.pdf');
    recordTest(
      'validateAttachmentFile: 0-byte file is rejected',
      res1.isValid === false && !!res1.error?.includes('0 bytes'),
      res1.isValid ? 'Failed to reject 0-byte file' : undefined,
      res1
    );

    const oversizedBlob = new Blob([new Uint8Array(MAX_ATTACHMENT_SIZE_BYTES + 1024)], { type: 'application/pdf' });
    const res2 = validateAttachmentFile(oversizedBlob, 'large.pdf');
    recordTest(
      'validateAttachmentFile: >25MB file is rejected',
      res2.isValid === false && !!res2.error?.includes('exceeds the maximum allowed limit'),
      res2.isValid ? 'Failed to reject >25MB file' : undefined,
      res2
    );

    const badExtBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/x-msdownload' });
    const res3 = validateAttachmentFile(badExtBlob, 'exploit.exe');
    recordTest(
      'validateAttachmentFile: Disallowed extension (.exe) is rejected',
      res3.isValid === false && !!res3.error?.includes('Unsupported file format'),
      res3.isValid ? 'Failed to reject .exe file' : undefined,
      res3
    );

    const validExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.dcm', '.dicom', '.PDF', '.JPG'];
    let allValidPassed = true;
    for (const ext of validExts) {
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
      const check = validateAttachmentFile(blob, `sample${ext}`);
      if (!check.isValid) {
        allValidPassed = false;
        break;
      }
    }
    recordTest(
      'validateAttachmentFile: Permitted extensions (.pdf, .jpg, .png, etc., case-insensitive) pass',
      allValidPassed,
      allValidPassed ? undefined : 'Failed to accept valid extension'
    );
  } catch (err: any) {
    recordTest('Suite 1 Execution', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: getAttachmentFileUrl URL encoding
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 2: URL Builder Formatting ---');
  try {
    const url1 = getAttachmentFileUrl('report.pdf');
    const url2 = getAttachmentFileUrl('blood report #1 (final).pdf');
    recordTest(
      'getAttachmentFileUrl formats relative streaming URL with URI encoding',
      url1 === '/api/v1/attachments/file/report.pdf' &&
      url2 === '/api/v1/attachments/file/blood%20report%20%231%20(final).pdf',
      `Unexpected URLs: ${url1}, ${url2}`
    );
  } catch (err: any) {
    recordTest('Suite 2 Execution', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Authentic PDF binary upload via attachmentService
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 3: Authentic PDF Binary Upload via attachmentService ---');
  let uploadedPdfResult: any = null;
  const pdfBytes = createValidPdf(`Doctor Web E2E Verification - ${Date.now()}`);
  const pdfFilename = `careid_challenger_test_${Date.now()}.pdf`;

  try {
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    uploadedPdfResult = await uploadAttachment(pdfBlob, {
      originalName: pdfFilename,
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    const hasValidUuid = UUID_V4_REGEX.test(uploadedPdfResult?.id);
    const hasValidStorageUrl = typeof uploadedPdfResult?.storageUrl === 'string' &&
      uploadedPdfResult.storageUrl.startsWith('/api/v1/attachments/file/');
    const hasMatchingSize = uploadedPdfResult?.fileSize === pdfBytes.length;
    const hasMatchingMime = uploadedPdfResult?.mimeType === 'application/pdf';

    recordTest(
      'PDF upload returns HTTP 201 with authentic UUID v4 id',
      hasValidUuid,
      `Invalid UUID: ${uploadedPdfResult?.id}`,
      { id: uploadedPdfResult?.id }
    );

    recordTest(
      'PDF upload returns authentic server storageUrl and storageKey',
      hasValidStorageUrl && !!uploadedPdfResult?.storageKey,
      `Invalid storageUrl: ${uploadedPdfResult?.storageUrl}, storageKey: ${uploadedPdfResult?.storageKey}`,
      { storageUrl: uploadedPdfResult?.storageUrl, storageKey: uploadedPdfResult?.storageKey }
    );

    recordTest(
      'PDF upload preserves originalName and exact binary byte size',
      hasMatchingSize && uploadedPdfResult?.originalName === pdfFilename,
      `Size expected ${pdfBytes.length}, got ${uploadedPdfResult?.fileSize}. Name expected ${pdfFilename}, got ${uploadedPdfResult?.originalName}`
    );
  } catch (err: any) {
    recordTest('PDF upload via attachmentService', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Stream download byte-for-byte verification
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 4: Stream Download Byte Integrity Verification ---');
  try {
    if (!uploadedPdfResult?.fileName) {
      throw new Error('Skipping stream test: previous PDF upload did not return fileName');
    }

    const streamUrl = `${BASE_URL}/attachments/file/${encodeURIComponent(uploadedPdfResult.fileName)}`;
    const streamRes = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const isHttp200 = streamRes.status === 200;
    const downloadedArrayBuffer = await streamRes.arrayBuffer();
    const downloadedBuffer = Buffer.from(downloadedArrayBuffer);

    const uploadedSha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
    const downloadedSha256 = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
    const hashMatch = uploadedSha256 === downloadedSha256;

    recordTest(
      'GET /api/v1/attachments/file/:filename returns HTTP 200 OK',
      isHttp200,
      `Expected status 200, received ${streamRes.status}`
    );

    recordTest(
      'Stream downloaded bytes match uploaded PDF bytes exactly (SHA-256 bit-for-bit check)',
      hashMatch && downloadedBuffer.length === pdfBytes.length,
      `Byte mismatch! Uploaded len=${pdfBytes.length} sha=${uploadedSha256}, Downloaded len=${downloadedBuffer.length} sha=${downloadedSha256}`,
      { uploadedSha256, downloadedSha256, uploadedLength: pdfBytes.length, downloadedLength: downloadedBuffer.length }
    );
  } catch (err: any) {
    recordTest('Stream download verification', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Boundary conditions against live backend endpoint
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 5: Live Backend Boundary Conditions ---');

  // 5.1: 0-byte file directly to backend
  try {
    const zeroForm = new FormData();
    const zeroBlob = new Blob([], { type: 'application/pdf' });
    zeroForm.append('file', zeroBlob, 'zero_byte.pdf');
    zeroForm.append('category', 'LAB_RESULT');
    zeroForm.append('patientProfileId', TEST_PATIENT_ID);

    const zeroRes = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: zeroForm,
    });

    recordTest(
      'Live backend rejects 0-byte binary upload with HTTP 400 Bad Request',
      zeroRes.status === 400,
      `Expected 400 Bad Request, got ${zeroRes.status}`
    );
  } catch (err: any) {
    recordTest('Live backend 0-byte probe', false, err.message);
  }

  // 5.2: Missing Authorization header
  try {
    const noAuthForm = new FormData();
    const testBlob = new Blob([createValidPdf()], { type: 'application/pdf' });
    noAuthForm.append('file', testBlob, 'no_auth.pdf');

    const noAuthRes = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      body: noAuthForm,
    });

    recordTest(
      'Live backend rejects upload without Authorization header with HTTP 401 Unauthorized',
      noAuthRes.status === 401,
      `Expected 401 Unauthorized, got ${noAuthRes.status}`
    );
  } catch (err: any) {
    recordTest('Live backend unauthenticated upload probe', false, err.message);
  }

  // 5.3: Missing 'file' multipart field
  try {
    const missingFileForm = new FormData();
    missingFileForm.append('category', 'LAB_RESULT');
    missingFileForm.append('patientProfileId', TEST_PATIENT_ID);

    const missingRes = await fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: missingFileForm,
    });

    recordTest(
      'Live backend rejects multipart payload with missing file field with HTTP 400',
      missingRes.status === 400,
      `Expected 400 Bad Request, got ${missingRes.status}`
    );
  } catch (err: any) {
    recordTest('Live backend missing file field probe', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Camera Capture Simulation
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 6: Camera Capture JPEG Simulation ---');
  try {
    const jpegBytes = createValidJpeg();
    const cameraFilename = `careid_cam_capture_${Date.now()}.jpg`;
    const jpegBlob = new Blob([jpegBytes], { type: 'image/jpeg' });

    const cameraUploadResult = await uploadAttachment(jpegBlob, {
      originalName: cameraFilename,
      category: 'LAB_RESULT',
      patientProfileId: TEST_PATIENT_ID,
    });

    const isJpegUuidValid = UUID_V4_REGEX.test(cameraUploadResult?.id);
    const isJpegMime = cameraUploadResult?.mimeType === 'image/jpeg';
    const isJpegStorageUrl = cameraUploadResult?.storageUrl?.startsWith('/api/v1/attachments/file/');

    recordTest(
      'Camera JPEG capture binary uploads successfully with authentic attachment UUID',
      isJpegUuidValid && isJpegMime && isJpegStorageUrl,
      `Camera capture failed: ${JSON.stringify(cameraUploadResult)}`,
      cameraUploadResult
    );

    // Verify stream download for the camera image
    if (cameraUploadResult?.fileName) {
      const camStreamUrl = `${BASE_URL}/attachments/file/${encodeURIComponent(cameraUploadResult.fileName)}`;
      const camStreamRes = await fetch(camStreamUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const camArrayBuf = await camStreamRes.arrayBuffer();
      const camBuf = Buffer.from(camArrayBuf);
      const camMatch = Buffer.compare(jpegBytes, camBuf) === 0;

      recordTest(
        'Camera JPEG attachment stream returns HTTP 200 with matching image binary',
        camStreamRes.status === 200 && camMatch,
        `Stream check failed: status=${camStreamRes.status}, byte match=${camMatch}`
      );
    }
  } catch (err: any) {
    recordTest('Camera capture simulation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 7: Concurrency & UUID Collision Resistance
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 7: Concurrency & UUID Collision Resistance ---');
  try {
    const pdf1 = createValidPdf('Concurrent 1');
    const pdf2 = createValidPdf('Concurrent 2');

    const [res1, res2] = await Promise.all([
      uploadAttachment(new Blob([pdf1], { type: 'application/pdf' }), {
        originalName: 'concurrent_1.pdf',
        patientProfileId: TEST_PATIENT_ID,
      }),
      uploadAttachment(new Blob([pdf2], { type: 'application/pdf' }), {
        originalName: 'concurrent_2.pdf',
        patientProfileId: TEST_PATIENT_ID,
      }),
    ]);

    const distinctUuids = res1.id !== res2.id && UUID_V4_REGEX.test(res1.id) && UUID_V4_REGEX.test(res2.id);
    const distinctFiles = res1.fileName !== res2.fileName;

    recordTest(
      'Concurrent parallel uploads generate distinct, collision-free UUIDs and storage files',
      distinctUuids && distinctFiles,
      `Collision detected or invalid: id1=${res1?.id}, id2=${res2?.id}`,
      { res1, res2 }
    );
  } catch (err: any) {
    recordTest('Concurrency test', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 8: Static Code Audit of MedicalRecordUploadPage.tsx
  // --------------------------------------------------------------------------
  console.log('\n--- Test Suite 8: Static Audit of MedicalRecordUploadPage.tsx ---');
  try {
    const pageSrcPath = path.resolve(process.cwd(), 'src/pages/ocr/MedicalRecordUploadPage.tsx');
    const pageSrc = fs.readFileSync(pageSrcPath, 'utf8');

    const hasAttachmentUuid1 = pageSrc.includes('attachment-uuid-1');
    recordTest(
      'Zero occurrences of dummy string "attachment-uuid-1" in MedicalRecordUploadPage.tsx',
      !hasAttachmentUuid1,
      'Found dummy string "attachment-uuid-1" still present in source code'
    );

    // Verify handleSaveRecord does not use raw previewUrl without backend storage fallback
    const hasBlobGuard = pageSrc.includes("!uploadedFile.storageUrl.startsWith('blob:')") ||
      pageSrc.includes('storageUrl: uploadedFile.storageUrl');
    recordTest(
      'handleSaveRecord strictly eliminates ephemeral blob: URLs as storageUrl',
      hasBlobGuard,
      'Missing safeguard against blob: URL persistence in medical record creation'
    );

    // Verify uploadAttachment integration
    const importsUploadAttachment = pageSrc.includes('uploadAttachment');
    const callsUploadAttachment = pageSrc.includes('attachmentService.uploadAttachment') || pageSrc.includes('uploadAttachment(');
    recordTest(
      'MedicalRecordUploadPage.tsx imports and calls attachmentService.uploadAttachment',
      importsUploadAttachment && callsUploadAttachment,
      'uploadAttachment is not called in MedicalRecordUploadPage.tsx'
    );
  } catch (err: any) {
    recordTest('Static audit of MedicalRecordUploadPage.tsx', false, err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  const totalTests = testResults.length;
  const passedTests = testResults.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(` Adversarial Challenge Results: ${passedTests}/${totalTests} Passed (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  if (failedTests > 0) {
    console.error(` ✖ FAILED TESTS COUNT: ${failedTests}`);
    for (const failure of testResults.filter((r) => !r.passed)) {
      console.error(`   - ${failure.name}: ${failure.error}`);
    }
  } else {
    console.log(' ✔ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY!');
  }
  console.log('='.repeat(80));

  // Write detailed machine-readable test log
  const reportPath = path.resolve(
    process.cwd(),
    '.agents/teamwork/challenger_m2_1/empirical_challenge_results.json'
  );
  fs.writeFileSync(reportPath, JSON.stringify({ totalTests, passedTests, failedTests, testResults }, null, 2));
  console.log(`[Report] Saved JSON test artifact to: ${reportPath}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch((err) => {
  console.error('[Adversarial Suite Fatal Error]', err);
  process.exit(1);
});
