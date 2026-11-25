/**
 * Empirical Challenger 1 - Milestone 1 Stress & Adversarial Test Harness
 * Directly probes live backend at https://360api.vnvision.in
 */

// Set up browser-like environment for Node
const storage = new Map<string, string>();
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { getDoctorToken, TEST_PATIENT_ID } from './helpers/authHelper.ts';
import { createValidPngBuffer, createValidPdfBuffer } from './helpers/fixtures.ts';
import { patientService } from '../../src/services/patientService.ts';
import { apiClient, postFormData, ApiError } from '../../src/services/apiClient.ts';

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
  console.log(' EMPIRICAL CHALLENGER 1 — MILESTONE 1 ADVERSARIAL STRESS HARNESS');
  console.log(' Live Target Backend: https://360api.vnvision.in');
  console.log('='.repeat(80));

  // Step 0: Warm session
  console.log('\n[Phase 0] Acquiring authentic doctor session token...');
  const token = await getDoctorToken();
  sessionStorage.setItem('careid_access_token', token);
  console.log(`[Phase 0] Doctor session established. Token length: ${token.length}`);

  // =========================================================================
  // SUITE 1: Patient Profile Resolution Probes
  // =========================================================================
  console.log('\n▶ Suite 1: Patient Profile Resolution (Authentic & Adversarial Probes)');

  await runTest('P01: Authentic Marcus Doe profile resolution matches exact demographics', async () => {
    const profile = await patientService.getDoctorPatientProfile(TEST_PATIENT_ID);
    if (!profile) throw new Error('Profile is undefined');
    if (profile.id !== TEST_PATIENT_ID) throw new Error(`id mismatch: expected ${TEST_PATIENT_ID}, got ${profile.id}`);
    if (profile.firstName !== 'Marcus') throw new Error(`firstName mismatch: expected Marcus, got ${profile.firstName}`);
    if (profile.lastName !== 'Doe') throw new Error(`lastName mismatch: expected Doe, got ${profile.lastName}`);
    if (profile.fullName !== 'Marcus Doe') throw new Error(`fullName mismatch: expected Marcus Doe, got ${profile.fullName}`);
    if (profile.patientNumber !== '+16505550004') throw new Error(`patientNumber mismatch: expected +16505550004, got ${profile.patientNumber}`);
    if (profile.dateOfBirth !== '1990-01-01') throw new Error(`dateOfBirth mismatch: expected 1990-01-01, got ${profile.dateOfBirth}`);
    if (profile.gender !== 'Male') throw new Error(`gender mismatch: expected Male, got ${profile.gender}`);
    if (profile.bloodGroup !== 'O+') throw new Error(`bloodGroup mismatch: expected O+, got ${profile.bloodGroup}`);
    if (!profile.knownAllergies.includes('Penicillin')) throw new Error('knownAllergies missing Penicillin');
    if (!profile.chronicConditions.includes('Diabetes Type 2')) throw new Error('chronicConditions missing Diabetes Type 2');
  });

  await runTest('P02: Profile resolution handles whitespace trimming around valid UUID', async () => {
    const paddedId = `   ${TEST_PATIENT_ID}   `;
    const profile = await patientService.getDoctorPatientProfile(paddedId);
    if (profile.id !== TEST_PATIENT_ID || profile.firstName !== 'Marcus') {
      throw new Error(`Whitespace-padded UUID failed to resolve Marcus: got ${profile.firstName}`);
    }
  });

  await runTest('P03: Empty string patientProfileId rejects with ApiError 400', async () => {
    try {
      await patientService.getDoctorPatientProfile('');
      throw new Error('Expected 400 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${err.statusCode}`);
    }
  });

  await runTest('P04: Whitespace-only patientProfileId rejects with ApiError 400', async () => {
    try {
      await patientService.getDoctorPatientProfile('     ');
      throw new Error('Expected 400 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${err.statusCode}`);
    }
  });

  await runTest('P05: Non-existent all-zero UUID returns genuine HTTP 404 from backend', async () => {
    try {
      await patientService.getDoctorPatientProfile('00000000-0000-0000-0000-000000000000');
      throw new Error('Expected 404 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 404) throw new Error(`Expected statusCode 404, got ${err.statusCode}`);
      if (!err.message.includes('00000000-0000-0000-0000-000000000000')) {
        throw new Error(`Expected message to cite patient ID, got ${err.message}`);
      }
    }
  });

  await runTest('P06: Arbitrary unassigned UUID returns genuine HTTP 404 from backend', async () => {
    try {
      await patientService.getDoctorPatientProfile('e89f5381-1234-4567-89ab-cdef01234567');
      throw new Error('Expected 404 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 404) throw new Error(`Expected statusCode 404, got ${err.statusCode}`);
    }
  });

  await runTest('P07: Malformed non-UUID string safely returns HTTP error (>= 400)', async () => {
    try {
      await patientService.getDoctorPatientProfile('malformed-not-a-uuid-!@#$%');
      throw new Error('Expected error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode < 400) throw new Error(`Expected status >= 400, got ${err.statusCode}`);
    }
  });

  await runTest('P08: Path traversal injection is blocked and returns HTTP error (>= 400)', async () => {
    try {
      await patientService.getDoctorPatientProfile('../../admin/patients');
      throw new Error('Expected error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode < 400) throw new Error(`Expected status >= 400, got ${err.statusCode}`);
    }
  });

  await runTest('P09: SQL injection string in patient ID returns HTTP error (>= 400)', async () => {
    try {
      await patientService.getDoctorPatientProfile("787e5187' OR '1'='1");
      throw new Error('Expected error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode < 400) throw new Error(`Expected status >= 400, got ${err.statusCode}`);
    }
  });

  await runTest('P10: patientService.getPatientById delegates to getDoctorPatientProfile without admin 403', async () => {
    const profile = await patientService.getPatientById(TEST_PATIENT_ID);
    if (profile.fullName !== 'Marcus Doe') {
      throw new Error(`getPatientById returned wrong name: ${profile.fullName}`);
    }
  });

  await runTest('P11: getPatientMedicalRecords executes cleanly without 403 admin route regression', async () => {
    const records = await patientService.getPatientMedicalRecords(TEST_PATIENT_ID);
    if (!Array.isArray(records)) {
      throw new Error(`Expected records to be an array, got ${typeof records}`);
    }
  });

  // =========================================================================
  // SUITE 2: Multipart Upload Transport Probes
  // =========================================================================
  console.log('\n▶ Suite 2: Multipart Upload Transport (Binary & Boundary Probes)');

  await runTest('M01a: Minimal valid 67-byte PNG binary payload uploads with HTTP 201 Created', async () => {
    // 1x1 pixel valid PNG (67 bytes)
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const formData = new FormData();
    formData.append('category', 'OTHER');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const blob = new Blob([minimalPng], { type: 'image/png' });
    formData.append('file', blob, 'challenger_minimal.png');

    const res = await apiClient.postFormData<{
      id: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      storageUrl?: string;
    }>('/api/v1/attachments', formData);

    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
    if (!res.data?.id) throw new Error('Missing attachment ID');
    if (!/^[0-9a-f-]{36}$/i.test(res.data.id)) throw new Error(`Invalid UUID: ${res.data.id}`);
    if (res.data.fileSize !== minimalPng.length) {
      throw new Error(`Expected fileSize ${minimalPng.length}, got ${res.data.fileSize}`);
    }
  });

  await runTest('M01b: 1-byte truncated/corrupt binary is rejected by backend with "empty or corrupted" validation', async () => {
    const formData = new FormData();
    formData.append('category', 'OTHER');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const oneByte = new Uint8Array([0x5a]);
    const blob = new Blob([oneByte], { type: 'image/png' });
    formData.append('file', blob, 'challenger_1byte.png');

    try {
      await apiClient.postFormData('/api/v1/attachments', formData);
      throw new Error('Expected backend to reject 1-byte corrupt file, but upload succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${err.statusCode}`);
      if (!err.message.includes('empty or corrupted')) {
        throw new Error(`Expected error message to mention empty or corrupted, got: ${err.message}`);
      }
    }
  });

  await runTest('M01c: Unsupported file extension (.bin) is rejected by backend with HTTP 400 validation error', async () => {
    const formData = new FormData();
    formData.append('category', 'OTHER');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const oneByte = new Uint8Array([0x5a]);
    const blob = new Blob([oneByte], { type: 'application/octet-stream' });
    formData.append('file', blob, 'challenger_1byte.bin');

    try {
      await apiClient.postFormData('/api/v1/attachments', formData);
      throw new Error('Expected 400 error for .bin extension, but upload succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${err.statusCode}`);
      if (!err.message.includes('not supported')) {
        throw new Error(`Expected error message to mention unsupported extension, got: ${err.message}`);
      }
    }
  });

  await runTest('M02: Authentic PNG buffer uploads successfully with image/png MIME and valid UUID', async () => {
    const png = createValidPngBuffer();
    const formData = new FormData();
    formData.append('category', 'LAB_RESULT');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const blob = new Blob([png], { type: 'image/png' });
    const exactName = `challenger_scan_${Date.now()}.png`;
    formData.append('file', blob, exactName);

    const res = await postFormData<{
      id: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      category?: string;
      patientProfileId?: string;
    }>('/api/v1/attachments', formData);

    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
    if (!res.data?.id) throw new Error('Missing attachment ID');
    if (res.data.mimeType !== 'image/png') throw new Error(`Expected image/png, got ${res.data.mimeType}`);
    if (res.data.originalName !== exactName) throw new Error(`Original name mismatch: expected ${exactName}, got ${res.data.originalName}`);
    if (res.data.fileSize !== png.length) throw new Error(`File size mismatch: expected ${png.length}, got ${res.data.fileSize}`);
  });

  await runTest('M03: Authentic multi-page PDF buffer uploads successfully with application/pdf MIME', async () => {
    const pdf = createValidPdfBuffer(2, 'Empirical Challenger Multi-Page Verification');
    const formData = new FormData();
    formData.append('category', 'MEDICAL_REPORT');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const exactName = `challenger_doc_${Date.now()}.pdf`;
    formData.append('file', blob, exactName);

    const res = await apiClient.postFormData<{
      id: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      storageUrl?: string;
    }>('/api/v1/attachments', formData);

    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
    if (!res.data?.id) throw new Error('Missing attachment ID');
    if (res.data.mimeType !== 'application/pdf') throw new Error(`Expected application/pdf, got ${res.data.mimeType}`);
    if (res.data.fileSize !== pdf.length) throw new Error(`File size mismatch: expected ${pdf.length}, got ${res.data.fileSize}`);
  });

  await runTest('M04: Boundary defense strips conflicting Content-Type: application/json override', async () => {
    const png = createValidPngBuffer();
    const formData = new FormData();
    formData.append('category', 'PRESCRIPTION');
    formData.append('patientProfileId', TEST_PATIENT_ID);
    const blob = new Blob([png], { type: 'image/png' });
    formData.append('file', blob, 'boundary_defense_test.png');

    // Deliberately pass a rigid Content-Type header that would corrupt multipart boundary if not stripped
    const res = await apiClient.postFormData<{ id: string; mimeType: string }>(
      '/api/v1/attachments',
      formData,
      { 'Content-Type': 'application/json' }
    );

    if (res.statusCode !== 201) throw new Error(`Expected 201, got ${res.statusCode}`);
    if (!res.data?.id) throw new Error('Expected valid attachment ID despite erroneous header input');
  });

  await runTest('M05: Missing file part in FormData returns genuine HTTP 400 Bad Request', async () => {
    const formData = new FormData();
    formData.append('category', 'LAB_RESULT'); // file intentionally omitted

    try {
      await apiClient.postFormData('/api/v1/attachments', formData);
      throw new Error('Expected 400 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 400) throw new Error(`Expected statusCode 400, got ${err.statusCode}`);
    }
  });

  // =========================================================================
  // SUITE 3: JSON Transport Regression & Core Client Probes
  // =========================================================================
  console.log('\n▶ Suite 3: JSON Transport Regression & Core Client Probes');

  await runTest('J01: Non-FormData JSON requests continue to function with application/json', async () => {
    // Probe a read endpoint via apiClient.get
    const meRes = await apiClient.get<{ id: string; role: string }>('/api/v1/auth/me');
    if (meRes.statusCode !== 200) throw new Error(`Expected 200 from /auth/me, got ${meRes.statusCode}`);
    if (!meRes.data?.id) throw new Error('Expected authenticated user id from /auth/me');
  });

  await runTest('J02: Unauthenticated request throws ApiError with statusCode 401', async () => {
    const savedToken = sessionStorage.getItem('careid_access_token');
    try {
      sessionStorage.removeItem('careid_access_token');
      await apiClient.get('/api/v1/auth/me');
      throw new Error('Expected 401 error, but call succeeded');
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) throw new Error(`Expected ApiError, got ${String(err)}`);
      if (err.statusCode !== 401) throw new Error(`Expected statusCode 401, got ${err.statusCode}`);
    } finally {
      if (savedToken) sessionStorage.setItem('careid_access_token', savedToken);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(` RESULTS: Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed}`);
  console.log('='.repeat(80));

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
