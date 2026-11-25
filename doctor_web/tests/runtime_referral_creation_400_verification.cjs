/**
 * CareID Doctor Web — Referral Creation HTTP 400 Root Cause & End-to-End Runtime Verification Suite
 * 
 * Target: https://360api.vnvision.in/api/v1
 * Tests:
 * 1. Capture rejected payloads & exact backend error responses for all candidate fields.
 * 2. Verify NestJS forbidNonWhitelisted validation rules on CreateReferralDto.
 * 3. Verify doctor-facility affiliation mismatch HTTP 400 error.
 * 4. Verify successful referral dispatch with corrected payload mapping.
 * 5. Verify created referral persistence and retrieval from Referral Hub (GET /referrals).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_HOST = '360api.vnvision.in';
const BASE_PATH = '/api/v1';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function getDoctorToken() {
  const cachePath = path.resolve(process.cwd(), '.token_cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (cached.accessToken) {
        const test = await request({
          hostname: BASE_HOST,
          path: `${BASE_PATH}/auth/me`,
          method: 'GET',
          headers: { Authorization: `Bearer ${cached.accessToken}` },
        });
        if (test.status === 200) {
          return cached.accessToken;
        }
      }
    } catch {
      // Refresh needed
    }
  }

  const reqRes = await request(
    {
      hostname: BASE_HOST,
      path: `${BASE_PATH}/auth/otp/request`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { phone: '+16505550003' }
  );

  const challengeId = reqRes.data?.data?.challengeId || reqRes.data?.challengeId;
  const verRes = await request(
    {
      hostname: BASE_HOST,
      path: `${BASE_PATH}/auth/otp/verify`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { challengeId, otpCode: '123456' }
  );

  const token = verRes.data?.data?.accessToken || verRes.data?.accessToken;
  fs.writeFileSync(cachePath, JSON.stringify({ accessToken: token }));
  return token;
}

async function runInvestigationAndVerification() {
  console.log('================================================================');
  console.log('CAREID — REFERRAL CREATION HTTP 400 ROOT CAUSE VERIFICATION');
  console.log('Target: https://' + BASE_HOST + BASE_PATH);
  console.log('================================================================\n');

  const token = await getDoctorToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const results = [];
  function record(testName, passed, details) {
    results.push({ testName, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}: ${testName}`);
    if (details) console.log(`   └─ ${details}`);
  }

  // Baseline valid payload structure
  const baselineValid = {
    patientId: '787e5187-7859-4320-bb1a-465a57dd086a', // Marcus Doe
    receivingFacilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', // Metro General Hospital
    receivingDoctorId: '1f06067b-e229-4707-84e2-afa27da2e4cd', // Dr. Sarah Jenkins (affiliated with Metro)
    priority: 'ROUTINE',
    referralType: 'SPECIALIST_CONSULTATION',
    reasonForReferral: 'Diagnostic workup for exertional chest tightness',
    clinicalSummary: 'ECG demonstrates ST depression in V4-V6. Baseline troponin borderline.',
    specialtyRequired: 'Cardiology',
  };

  // 1. Prove rejection of 'patientProfileId' (candidate field vs patientId)
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      { ...baselineValid, patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a' }
    );
    const hasErrMsg = Array.isArray(res.data?.message) && res.data.message.includes('property patientProfileId should not exist');
    record(
      'Rejection of "patientProfileId" (Must be patientId)',
      res.status === 400 && hasErrMsg,
      `Status: ${res.status}, Error: ${JSON.stringify(res.data?.message)}`
    );
  } catch (err) {
    record('Rejection of "patientProfileId"', false, err.message);
  }

  // 2. Prove rejection of 'facilityId' (candidate field vs receivingFacilityId)
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      { ...baselineValid, facilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb' }
    );
    const hasErrMsg = Array.isArray(res.data?.message) && res.data.message.includes('property facilityId should not exist');
    record(
      'Rejection of "facilityId" (Must be receivingFacilityId)',
      res.status === 400 && hasErrMsg,
      `Status: ${res.status}, Error: ${JSON.stringify(res.data?.message)}`
    );
  } catch (err) {
    record('Rejection of "facilityId"', false, err.message);
  }

  // 3. Prove rejection of 'specialty' (candidate field vs specialtyRequired)
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      { ...baselineValid, specialty: 'Cardiology' }
    );
    const hasErrMsg = Array.isArray(res.data?.message) && res.data.message.includes('property specialty should not exist');
    record(
      'Rejection of "specialty" (Must be specialtyRequired)',
      res.status === 400 && hasErrMsg,
      `Status: ${res.status}, Error: ${JSON.stringify(res.data?.message)}`
    );
  } catch (err) {
    record('Rejection of "specialty"', false, err.message);
  }

  // 4. Prove rejection of 'referralReason' (candidate field vs reasonForReferral)
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      { ...baselineValid, referralReason: 'Chest pain' }
    );
    const hasErrMsg = Array.isArray(res.data?.message) && res.data.message.includes('property referralReason should not exist');
    record(
      'Rejection of "referralReason" (Must be reasonForReferral)',
      res.status === 400 && hasErrMsg,
      `Status: ${res.status}, Error: ${JSON.stringify(res.data?.message)}`
    );
  } catch (err) {
    record('Rejection of "referralReason"', false, err.message);
  }

  // 5. Prove rejection of 'includedRecords' in POST body
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      { ...baselineValid, includedRecords: { labs: true, imaging: true } }
    );
    const hasErrMsg = Array.isArray(res.data?.message) && res.data.message.includes('property includedRecords should not exist');
    record(
      'Rejection of "includedRecords" in CreateReferralDto',
      res.status === 400 && hasErrMsg,
      `Status: ${res.status}, Error: ${JSON.stringify(res.data?.message)}`
    );
  } catch (err) {
    record('Rejection of "includedRecords"', false, err.message);
  }

  // 6. Prove rejection of Doctor Affiliation Mismatch (Dr. House or Dr. Smith sent to Metro)
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      {
        ...baselineValid,
        receivingDoctorId: 'a11a1c59-0a77-4dfb-9105-96364c72573b', // Dr. Gregory House (not affiliated with Metro)
      }
    );
    const isAffiliationErr = res.data?.message === 'Receiving doctor is not actively affiliated with the receiving facility';
    record(
      'Rejection on Doctor Affiliation Mismatch (HTTP 400)',
      res.status === 400 && isAffiliationErr,
      `Status: ${res.status}, Error: "${res.data?.message}"`
    );
  } catch (err) {
    record('Rejection on Doctor Affiliation Mismatch', false, err.message);
  }

  // 7. Verify Successful Referral Dispatch with Corrected Mapping
  let createdReferralId = '';
  let createdReferralNumber = '';
  try {
    const res = await request(
      { hostname: BASE_HOST, path: `${BASE_PATH}/referrals`, method: 'POST', headers },
      baselineValid
    );
    const ref = res.data?.data || res.data;
    createdReferralId = ref?.id;
    createdReferralNumber = ref?.referralNumber;
    record(
      'Successful Referral Creation with Correct Mapping (HTTP 201)',
      res.status === 201 && !!createdReferralId,
      `Status: ${res.status}, Persisted ID: ${createdReferralId}, Number: ${createdReferralNumber}`
    );
  } catch (err) {
    record('Successful Referral Creation', false, err.message);
  }

  // 8. Verify Referral Appears in Referral Hub (GET /referrals)
  try {
    const listRes = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/referrals?limit=20`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(listRes.data?.data) ? listRes.data.data : (Array.isArray(listRes.data) ? listRes.data : []);
    const located = items.find((r) => r.id === createdReferralId || r.referralNumber === createdReferralNumber);
    record(
      'Created Referral Appears in Referral Hub Directory',
      !!located,
      `Located referral ${located?.referralNumber} in active listing. Patient: ${located?.patient?.fullName || 'Marcus Doe'}, Facility: ${located?.receivingFacility?.name || 'Metro General'}`
    );
  } catch (err) {
    record('Created Referral Appears in Referral Hub Directory', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} Tests Passed`);
  console.log('================================================================');

  if (results.some((r) => !r.passed)) {
    process.exit(1);
  }
}

runInvestigationAndVerification();

