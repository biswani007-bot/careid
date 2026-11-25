// Set up browser-like environment for Node
const storage = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import { getDoctorToken } from '../../../tests/e2e/helpers/authHelper';
import { createValidPngBuffer } from '../../../tests/e2e/helpers/fixtures';
import { patientService } from '../../../src/services/patientService';
import { apiClient, postFormData, ApiError } from '../../../src/services/apiClient';

async function runAdversarialTests() {
  console.log('===========================================================');
  console.log(' ADVERSARIAL STRESS TEST SUITE — MILESTONE 1 REVIEWER 2');
  console.log('===========================================================');

  const token = await getDoctorToken();
  sessionStorage.setItem('careid_access_token', token);

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Boundary & Malformed Inputs on Patient Profile Lookup
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Patient Profile Lookup Boundaries & 404 Clean Handling ---');
  
  // 1.1 Empty String
  try {
    await patientService.getDoctorPatientProfile('');
    assert(false, 'Empty patientProfileId should reject with ApiError');
  } catch (err: any) {
    assert(err instanceof ApiError && err.statusCode === 400, 'Empty patientProfileId rejects with 400 BadRequest');
  }

  // 1.2 Whitespace String
  try {
    await patientService.getDoctorPatientProfile('    ');
    assert(false, 'Whitespace patientProfileId should reject with ApiError');
  } catch (err: any) {
    assert(err instanceof ApiError && err.statusCode === 400, 'Whitespace patientProfileId rejects with 400 BadRequest');
  }

  // 1.3 Non-existent UUID (404 Not Found)
  try {
    await patientService.getDoctorPatientProfile('00000000-0000-0000-0000-000000000000');
    assert(false, 'Non-existent UUID should reject with 404');
  } catch (err: any) {
    assert(
      err instanceof ApiError && err.statusCode === 404 && err.message.includes('not found in the CareID registry'),
      `Non-existent UUID returns clean 404 ApiError: "${err.message}"`
    );
  }

  // 1.4 Path Traversal Attempt
  try {
    await patientService.getDoctorPatientProfile('../../admin/patients');
    assert(false, 'Path traversal ID should reject');
  } catch (err: any) {
    assert(err instanceof ApiError && err.statusCode >= 400, `Path traversal safely rejected with status ${err.statusCode}`);
  }

  // 1.5 Medical records for non-existent patient should return [] rather than crash
  try {
    const emptyRecords = await patientService.getPatientMedicalRecords('00000000-0000-0000-0000-000000000000');
    assert(Array.isArray(emptyRecords) && emptyRecords.length === 0, 'Medical records for non-existent patient returns empty array [] without crash');
  } catch (err: any) {
    assert(false, `getPatientMedicalRecords threw unexpected error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Live Patient Resolution (787e5187-7859-4320-bb1a-465a57dd086a)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Live Patient Resolution Demographics Integrity ---');
  try {
    const profile = await patientService.getDoctorPatientProfile('787e5187-7859-4320-bb1a-465a57dd086a');
    assert(profile.id === '787e5187-7859-4320-bb1a-465a57dd086a', 'Patient ID matches target UUID');
    assert(profile.firstName === 'Marcus' && profile.lastName === 'Doe', `Name is authentic: ${profile.fullName}`);
    assert(profile.dateOfBirth === '1990-01-01', `DOB is authentic: ${profile.dateOfBirth}`);
    assert(profile.gender === 'Male', `Gender is authentic: ${profile.gender}`);
    assert(profile.patientNumber === '+16505550004', `MRN/patientNumber is authentic: ${profile.patientNumber}`);
    assert(profile.bloodGroup === 'O+', `Blood group is authentic: ${profile.bloodGroup}`);
    assert(Array.isArray(profile.knownAllergies) && profile.knownAllergies.includes('Penicillin'), 'Allergies include Penicillin');
    assert(Array.isArray(profile.chronicConditions) && profile.chronicConditions.includes('Diabetes Type 2'), 'Chronic conditions include Diabetes Type 2');
    assert(typeof profile.currentAddress === 'object' && profile.currentAddress !== null, 'Current address object populated');
  } catch (err: any) {
    assert(false, `Live profile resolution failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: FormData Body Preservation and Header Behavior
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing FormData Body Preservation & Header Omission ---');
  const fd = new FormData();
  fd.append('patientProfileId', '787e5187-7859-4320-bb1a-465a57dd086a');
  fd.append('category', 'LAB_RESULT');
  fd.append('file', new Blob([createValidPngBuffer()], { type: 'image/png' }), 'adversarial_test.png');

  // Verify postFormData is available on both named export and apiClient object
  assert(typeof postFormData === 'function', 'Named export postFormData is a function');
  assert(typeof apiClient.postFormData === 'function', 'apiClient.postFormData is a function');

  // Perform live upload
  try {
    const uploadRes = await apiClient.postFormData<any>('/api/v1/attachments', fd);
    assert(uploadRes.statusCode === 201 || uploadRes.success === true, `Live upload returns HTTP 201 (got ${uploadRes.statusCode})`);
    assert(typeof uploadRes.data?.id === 'string' && uploadRes.data.id.length > 10, `Returned authentic attachment ID: ${uploadRes.data?.id}`);
    assert(uploadRes.data?.mimeType === 'image/png', `MimeType preserved: ${uploadRes.data?.mimeType}`);
  } catch (err: any) {
    assert(false, `postFormData live upload failed: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: 401 Refresh Logic Unit Stress-Test (FormData Body Integrity)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Stress-Testing 401 Token Refresh FormData Preservation ---');
  // Inspect global fetch intercept to test retry header handling
  const originalFetch = globalThis.fetch;
  let retryHeadersSeen: Record<string, string> | null = null;
  let retryBodySeen: any = null;
  let fetchCallCount = 0;

  try {
    (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCallCount++;
      const headers = (init?.headers || {}) as Record<string, string>;
      
      // If refresh URL, return mock token
      if (String(url).includes('/api/v1/auth/token/refresh')) {
        return new Response(JSON.stringify({
          success: true,
          statusCode: 200,
          data: { accessToken: 'new-mock-access-token', refreshToken: 'new-mock-refresh-token' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // First call: return 401 Unauthorized
      if (fetchCallCount === 1) {
        return new Response(JSON.stringify({
          success: false,
          statusCode: 401,
          message: 'Unauthorized'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      // Second call (retry): record headers and body
      retryHeadersSeen = headers;
      retryBodySeen = init?.body;
      return new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { id: 'retry-success-uuid' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    sessionStorage.setItem('careid_access_token', 'old-expired-token');
    sessionStorage.setItem('careid_refresh_token', 'valid-refresh-token');

    const testFormData = new FormData();
    testFormData.append('field1', 'val1');

    const result = await apiClient.postFormData<any>('/api/v1/attachments', testFormData);

    assert(result.data?.id === 'retry-success-uuid', '401 retry completed and returned success response');
    assert(retryHeadersSeen !== null, 'Retry fetch was executed');
    assert(retryHeadersSeen?.['Authorization'] === 'Bearer new-mock-access-token', 'Retry updated Authorization header with refreshed token');
    assert(!('Content-Type' in (retryHeadersSeen || {})), 'Retry strictly OMITTED Content-Type header for FormData');
    assert(!('content-type' in (retryHeadersSeen || {})), 'Retry strictly OMITTED lowercase content-type header for FormData');
    assert(retryBodySeen === testFormData, 'Retry preserved exact FormData body reference without re-stringifying to "{}"');

  } finally {
    globalThis.fetch = originalFetch;
    sessionStorage.setItem('careid_access_token', token);
  }

  console.log('\n===========================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialTests().catch((err) => {
  console.error('Fatal error in adversarial test runner:', err);
  process.exit(1);
});
