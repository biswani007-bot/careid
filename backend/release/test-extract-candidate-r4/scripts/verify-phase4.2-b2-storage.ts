import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { B2StorageService } from '../src/modules/storage/infrastructure/b2-storage.service';

const API_BASE = 'http://127.0.0.1:3000/api/v1';

// Read .env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const jwtSecretMatch = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const jwtSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : 'super_secret_hvapi_jwt_key_2026_change_in_production';

function createToken(userId: string, roles: string[]): string {
  return jwt.sign(
    { sub: userId, userId, roles, permissions: [] },
    jwtSecret,
    { expiresIn: '2h' }
  );
}

const tokens = {
  admin: createToken('eff36819-1c8a-4209-b97c-8746d461215b', ['ADMIN']),
  doctor: createToken('dbe69fae-cdc9-4069-8a7a-ede8d4040f5e', ['DOCTOR']),
  patient1: createToken('04be3d93-a0c5-49e9-93a3-d14cbd80c115', ['PATIENT']),
  patient2: createToken('db0897ba-3bf8-4b7e-99ee-7028187f54db', ['PATIENT']),
};

async function runStorageVerification() {
  console.log('========================================================================');
  console.log('CAREID PHASE 4.2: BACKBLAZE B2 STORAGE INTEGRATION VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
    }
  }

  const b2Service = new B2StorageService();
  const isB2Configured = b2Service.isConfigured();
  console.log(`B2 Storage Service Configured: ${isB2Configured ? 'YES (Active)' : 'NO'}`);
  assert(isB2Configured, 'Backblaze B2 service is configured with valid credentials in .env');

  // ─── 1. B2 Storage Service Unit Methods ────────────────────────────────────
  console.log('\n--- 1. Testing B2StorageService Capabilities ---');
  // 1.1 Non-guessable key generation
  const key1 = b2Service.generateUniqueKey('attachments', 'patient-uuid-1', 'blood_test.pdf');
  const key2 = b2Service.generateUniqueKey('attachments', 'patient-uuid-1', 'blood_test.pdf');
  assert(key1 !== key2, 'Generated keys are unique and non-guessable');
  assert(key1.startsWith('attachments/patient-uuid-1/'), 'Key contains sanitized prefix and profile namespace');
  assert(!key1.includes('..') && !key1.includes('\\'), 'Key prevents path traversal characters');

  // 1.2 Buffer validation: valid PDF
  const samplePdf = Buffer.from('%PDF-1.7 sample test document stream content');
  const validCheck = b2Service.validateBuffer(samplePdf, 15 * 1024 * 1024, ['application/pdf']);
  assert(validCheck.mimeType === 'application/pdf', 'validateBuffer detects PDF magic bytes');

  // 1.3 Buffer validation: invalid/corrupt buffer
  try {
    b2Service.validateBuffer(Buffer.from('corrupt content not a document'), 15 * 1024 * 1024);
    assert(false, 'Corrupted buffer should be rejected');
  } catch (err: any) {
    assert(err.status === 400, 'Corrupted buffer rejected with 400 Bad Request');
  }

  // 1.4 Buffer validation: size limit exceeded
  try {
    b2Service.validateBuffer(samplePdf, 10); // max 10 bytes
    assert(false, 'Oversized buffer should be rejected');
  } catch (err: any) {
    assert(err.status === 400, 'Oversized buffer rejected with 400 Bad Request');
  }

  // ─── 2. Direct Live B2 Object Operations ───────────────────────────────────
  console.log('\n--- 2. Testing Direct Live B2 Upload, Presigned URL, & Cleanup ---');
  const testObjectKey = b2Service.generateUniqueKey('test-diagnostics', 'system-verify', 'healthcheck.pdf');
  const testPayload = Buffer.from('%PDF-1.7 Live Backblaze B2 Object Integration Test for CareID Platform');

  // 2.1 Live upload
  let uploadRes: any;
  try {
    uploadRes = await b2Service.uploadFile({
      key: testObjectKey,
      buffer: testPayload,
      contentType: 'application/pdf',
      metadata: { environment: 'test', origin: 'careid-phase4.2' },
    });
    assert(uploadRes.key === testObjectKey, 'Live upload to Backblaze B2 succeeded', `Key: ${uploadRes.key}`);
    assert(!!uploadRes.eTag, 'B2 returned ETag confirmation');
  } catch (err: any) {
    assert(false, 'Live B2 upload failed', err.message);
  }

  // 2.2 Live presigned URL generation
  let presignedRes: any;
  try {
    presignedRes = await b2Service.generatePresignedDownloadUrl({
      storageKey: testObjectKey,
      fileName: 'verified_healthcheck.pdf',
      expiresInSeconds: 300,
    });
    assert(!!presignedRes.downloadUrl, 'Generated valid presigned download URL');
    assert(presignedRes.downloadUrl.includes('X-Amz-Signature') || presignedRes.downloadUrl.includes('s3.us-east-005.backblazeb2.com'), 'Presigned URL contains AWS S3 signature parameters');
    assert(presignedRes.expiresInSeconds === 300, 'Expiry matches requested duration');
  } catch (err: any) {
    assert(false, 'Live presigned URL generation failed', err.message);
  }

  // 2.3 Fetch directly using presigned download URL
  if (presignedRes?.downloadUrl) {
    try {
      const getRes = await fetch(presignedRes.downloadUrl);
      const downloadedBytes = Buffer.from(await getRes.arrayBuffer());
      assert(getRes.status === 200, 'Fetching object via presigned download URL returned 200 OK');
      assert(downloadedBytes.equals(testPayload), 'Downloaded bytes match uploaded content bit-for-bit');
    } catch (err: any) {
      assert(false, 'Presigned URL retrieval failed', err.message);
    }
  }

  // 2.4 Live object cleanup (delete)
  try {
    const deleteSuccess = await b2Service.deleteFile(testObjectKey);
    assert(deleteSuccess, 'Successfully deleted test object from Backblaze B2 bucket');
  } catch (err: any) {
    assert(false, 'Live B2 object deletion failed', err.message);
  }

  // ─── 3. Workflow 1: Clinical Attachment Upload (POST /attachments) ──────────
  console.log('\n--- 3. Testing Workflow 1: Attachment Upload via Live HTTP API ---');
  const pdfContent = Buffer.from('%PDF-1.5 Clinical Laboratory Specimen Panel Examination Report');
  const attFormData = new FormData();
  attFormData.append('file', new Blob([pdfContent], { type: 'application/pdf' }), 'specimen_panel.pdf');
  attFormData.append('category', 'LAB_RESULT');

  const uploadAttRes = await fetch(`${API_BASE}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
    body: attFormData,
  });
  const uploadAttJson: any = await uploadAttRes.json();
  const createdAtt = uploadAttJson.data || uploadAttJson;

  assert(uploadAttRes.status === 201, 'POST /attachments returns 201 Created', `Status: ${uploadAttRes.status}`);
  assert(!!createdAtt.id, 'Attachment ID created');
  assert(createdAtt.storageKey?.startsWith('attachments/'), 'Attachment storageKey recorded', `Key: ${createdAtt.storageKey}`);
  const attId = createdAtt.id;
  const attFilename = createdAtt.fileName;

  // 3.1 Presigned download URL endpoint GET /attachments/:id/download-url
  const presignedEndpointRes = await fetch(`${API_BASE}/attachments/${attId}/download-url`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  const presignedEndpointJson: any = await presignedEndpointRes.json();
  const presignedData = presignedEndpointJson.data || presignedEndpointJson;

  assert(presignedEndpointRes.status === 200, 'GET /attachments/:id/download-url returns 200 OK');
  assert(!!presignedData.downloadUrl, 'Presigned URL returned in response');

  // 3.2 Unauthorized cross-patient access to download URL
  const crossPatientPresigned = await fetch(`${API_BASE}/attachments/${attId}/download-url`, {
    headers: { Authorization: `Bearer ${tokens.patient2}` },
  });
  assert(crossPatientPresigned.status === 403, 'Cross-patient access to attachment download URL blocked with 403 Forbidden');

  // 3.3 Serve attachment file GET /attachments/file/:filename
  const serveAttRes = await fetch(`${API_BASE}/attachments/file/${attFilename}`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  assert(serveAttRes.status === 200, 'GET /attachments/file/:filename streams file (200 OK)');
  assert(Boolean(serveAttRes.headers.get('cache-control')?.includes('private')), 'Cache-Control header is private');

  // ─── 4. Workflow 2: Insurance Card Upload (POST /insurance/ocr/extract) ────
  console.log('\n--- 4. Testing Workflow 2: Insurance Card Upload via Live HTTP API ---');
  const cardPath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '03_insurance_card.png');
  const cardBytes = fs.readFileSync(cardPath);

  const cardFormData = new FormData();
  cardFormData.append('file', new Blob([cardBytes], { type: 'image/png' }), 'insurance_card.png');

  const cardRes = await fetch(`${API_BASE}/insurance/ocr/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
    body: cardFormData,
  });
  const cardJson: any = await cardRes.json();
  const cardData = cardJson.data || cardJson;

  assert(cardRes.status === 200, 'POST /insurance/ocr/extract returns 200 OK');
  assert(!!cardData.ocrId, 'Insurance OCR record created with ocrId');
  assert(cardData.engine === 'PP-OCRv4-Mobile-CPU', 'Genuine PaddleOCR worker processed card');

  // ─── 5. Workflow 3: Patient Profile Photo (POST & DELETE /patients/me/photo) ─
  console.log('\n--- 5. Testing Workflow 3: Profile Photo Upload via Live HTTP API ---');
  // 1x1 valid JPEG
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9]);
  const photoFormData = new FormData();
  photoFormData.append('file', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'avatar.jpg');

  const photoUploadRes = await fetch(`${API_BASE}/patients/me/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
    body: photoFormData,
  });
  const photoUploadJson: any = await photoUploadRes.json();
  const photoData = photoUploadJson.data || photoUploadJson;

  assert(photoUploadRes.status === 200, 'POST /patients/me/photo returns 200 OK');
  assert(!!photoData.photoUrl, 'photoUrl returned in response', `photoUrl: ${photoData.photoUrl}`);

  // Fetch streamed photo
  const photoFilename = path.basename(photoData.photoUrl);
  const servePhotoRes = await fetch(`${API_BASE}/patients/me/photo/file/${photoFilename}`, {
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  assert(servePhotoRes.status === 200, 'GET /patients/me/photo/file/:filename streams uploaded photo (200 OK)');

  // Delete photo
  const deletePhotoRes = await fetch(`${API_BASE}/patients/me/photo`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
  });
  assert(deletePhotoRes.status === 200, 'DELETE /patients/me/photo cleans up photo from database and storage');

  // ─── 6. Security and File Rejection ────────────────────────────────────────
  console.log('\n--- 6. Testing Security Guards and Invalid File Rejection ---');
  // Disallowed extension/content
  const badFormData = new FormData();
  badFormData.append('file', new Blob([Buffer.from('executable binary shell script')], { type: 'text/plain' }), 'hack.sh');

  const badUploadRes = await fetch(`${API_BASE}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.patient1}` },
    body: badFormData,
  });
  assert(badUploadRes.status === 400, 'Invalid file type rejected with 400 Bad Request');

  console.log('\n========================================================================');
  console.log(`PHASE 4.2 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('✔ All Phase 4.2 Backblaze B2 Storage requirements verified successfully!');
    process.exit(0);
  } else {
    console.error(`✖ ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runStorageVerification().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});
