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
import { apiClient, postFormData } from '../../../src/services/apiClient';

async function main() {
  console.log('Fetching active doctor token via authHelper...');
  const token = await getDoctorToken();
  console.log('Token acquired:', token.slice(0, 20) + '...');

  sessionStorage.setItem('careid_access_token', token);

  console.log('\n--- VERIFICATION STEP 1: Calling patientService.getDoctorPatientProfile("787e5187-7859-4320-bb1a-465a57dd086a") ---');
  try {
    const profile = await patientService.getDoctorPatientProfile('787e5187-7859-4320-bb1a-465a57dd086a');
    console.log('[PASS] Live Demographics successfully resolved:');
    console.log('  ID:', profile.id);
    console.log('  First Name:', profile.firstName);
    console.log('  Last Name:', profile.lastName);
    console.log('  Full Name:', profile.fullName);
    console.log('  DOB:', profile.dateOfBirth);
    console.log('  Gender:', profile.gender);
    console.log('  Patient Number / MRN:', profile.patientNumber);
    console.log('  Blood Group:', profile.bloodGroup);
    console.log('  Phone:', profile.phone || profile.phoneNumber);
    console.log('  Address:', profile.address);
    console.log('  Current Address:', JSON.stringify(profile.currentAddress));
    console.log('  Known Allergies:', profile.knownAllergies);
    console.log('  Chronic Conditions:', profile.chronicConditions);

    if (profile.firstName !== 'Marcus' || profile.lastName !== 'Doe') {
      throw new Error(`Expected Marcus Doe but got ${profile.firstName} ${profile.lastName}`);
    }
    if (profile.patientNumber !== '+16505550004') {
      throw new Error(`Expected +16505550004 but got ${profile.patientNumber}`);
    }
    console.log('\n[PASS] All demographic assertions verified!');
  } catch (err: any) {
    console.error('[FAIL] Error in patientService:', err);
    process.exit(1);
  }

  console.log('\n--- VERIFICATION STEP 2: Testing apiClient FormData & postFormData ---');
  try {
    const formData = new FormData();
    formData.append('category', 'LAB_RESULT');
    formData.append('patientProfileId', '787e5187-7859-4320-bb1a-465a57dd086a');
    const pngBuffer = createValidPngBuffer();
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('file', blob, 'sample_report.png');

    console.log('  postFormData function exported:', typeof postFormData);
    console.log('  apiClient.postFormData method:', typeof apiClient.postFormData);

    // Call live POST /api/v1/attachments using apiClient.postFormData
    console.log('  Executing live upload via apiClient.postFormData("/api/v1/attachments", formData)...');
    const uploadRes = await apiClient.postFormData<any>('/api/v1/attachments', formData);
    console.log('[PASS] Live multipart upload succeeded!');
    console.log('  Status Code:', uploadRes.statusCode);
    console.log('  Attachment ID:', uploadRes.data?.id);
    console.log('  File Name:', uploadRes.data?.fileName || uploadRes.data?.originalName);
    console.log('  Mime Type:', uploadRes.data?.mimeType);
    console.log('  Storage URL:', uploadRes.data?.storageUrl);
  } catch (err: any) {
    console.error('Error during upload test:', err);
    process.exit(1);
  }

  console.log('\n--- VERIFICATION STEP 3: Boundary Test for Invalid Patient ID ---');
  try {
    await patientService.getDoctorPatientProfile('00000000-0000-0000-0000-000000000000');
    console.error('[FAIL] Expected 404 error but received success!');
    process.exit(1);
  } catch (err: any) {
    console.log('[PASS] Properly caught ApiError for non-existent patient:');
    console.log('  Status code:', err.statusCode);
    console.log('  Message:', err.message);
  }

  console.log('\n=== ALL MILESTONE 1 VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

main();
