/**
 * CareID Doctor Web — Prescriptions & Clinical History Comprehensive Live Verification Suite
 * 
 * Verifies live staging endpoints against https://360api.vnvision.in/api/v1
 * Tests: Valid queries, mutations, database persistence, invalid IDs, unauthorized access,
 * and exact diagnostics for Task 1, Task 2, and Task 3.
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
      res.on('data', chunk => body += chunk);
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
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (cached.accessToken) {
      const test = await request({
        hostname: BASE_HOST,
        path: `${BASE_PATH}/auth/me`,
        method: 'GET',
        headers: { Authorization: `Bearer ${cached.accessToken}` }
      });
      if (test.status === 200) {
        return cached.accessToken;
      }
      if (cached.refreshToken) {
        const ref = await request({
          hostname: BASE_HOST,
          path: `${BASE_PATH}/auth/token/refresh`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, { refreshToken: cached.refreshToken });
        const newToken = ref.data?.data?.accessToken || ref.data?.accessToken;
        if (newToken) {
          cached.accessToken = newToken;
          fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2));
          return newToken;
        }
      }
    }
  }

  const reqRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/request`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003' });

  const challengeId = reqRes.data?.data?.challengeId || reqRes.data?.challengeId;
  const verRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/verify`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const tokenData = verRes.data?.data || verRes.data;
  if (tokenData?.accessToken) {
    fs.writeFileSync(cachePath, JSON.stringify({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      updatedAt: Date.now()
    }, null, 2));
    return tokenData.accessToken;
  }
  throw new Error('Could not acquire doctor token.');
}

async function runTests() {
  console.log('================================================================');
  console.log(' CareID Prescription & Clinical History Comprehensive Live Suite');
  console.log(` Target Backend: https://${BASE_HOST}${BASE_PATH}`);
  console.log('================================================================\n');

  const token = await getDoctorToken();
  console.log(`✔ [Auth] Authenticated as Attending Doctor. Token Length: ${token.length}`);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const testPatientId = '787e5187-7859-4320-bb1a-465a57dd086a'; // Marcus Doe

  // Test 1: Patient Profile Resolution
  console.log('\n[Test 1] Patient Profile Retrieval: GET /doctors/patients/:patientProfileId');
  const profileRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}`,
    method: 'GET',
    headers: authHeaders
  });
  if (profileRes.status === 200) {
    console.log(`✔ PASS: Patient profile resolved (HTTP 200). MRN: ${profileRes.data?.data?.patientNumber || 'Valid'}`);
  } else {
    throw new Error(`FAIL: Patient profile returned HTTP ${profileRes.status}`);
  }

  // Test 2: Prescription List Retrieval
  console.log('\n[Test 2] Prescription List Retrieval: GET /doctors/patients/:patientProfileId/prescriptions');
  const rxListRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/prescriptions?page=1&limit=20`,
    method: 'GET',
    headers: authHeaders
  });
  if (rxListRes.status === 200) {
    console.log(`✔ PASS: Prescriptions list retrieved (HTTP 200). Records Count: ${rxListRes.data?.data?.length ?? 0}`);
  } else {
    throw new Error(`FAIL: Prescription list returned HTTP ${rxListRes.status}`);
  }

  // Test 3: New Entry Prescription Creation & Persistence
  console.log('\n[Test 3] Prescription Creation & Persistence: POST /doctors/patients/:patientProfileId/prescriptions');
  const uniqueMed = `Atorvastatin-${Date.now().toString().slice(-4)}`;
  const createRxRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/prescriptions`,
    method: 'POST',
    headers: authHeaders
  }, {
    title: `Prescription for ${uniqueMed}`,
    medications: [
      {
        name: uniqueMed,
        dosage: "20mg",
        frequency: "Once daily at bedtime",
        duration: "90 days",
        instructions: "Take with evening meal"
      }
    ],
    description: "Lipid profile optimization",
    notes: "Liver function check in 12 weeks",
    diagnosis: "Hyperlipidemia (ICD-10 E78.5)",
    facilityName: "CareID Heart Institute",
    reportDate: new Date().toISOString()
  });

  let createdRxId = null;
  if (createRxRes.status === 201) {
    createdRxId = createRxRes.data?.data?.id || createRxRes.data?.id;
    console.log(`✔ PASS: Prescription created & persisted (HTTP 201). UUID: ${createdRxId}`);
  } else {
    throw new Error(`FAIL: Prescription creation returned HTTP ${createRxRes.status}`);
  }

  // Test 4: Database Persistence Verification for Prescription
  console.log('\n[Test 4] Database Persistence Verification: GET /doctors/patients/:id/prescriptions');
  const verifyRxList = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/prescriptions?page=1&limit=50`,
    method: 'GET',
    headers: authHeaders
  });
  const foundRx = verifyRxList.data?.data?.find(p => p.id === createdRxId);
  if (foundRx) {
    console.log(`✔ PASS: Persisted prescription confirmed in database. Title: "${foundRx.title}"`);
  } else {
    throw new Error('FAIL: Created prescription not found in subsequent list query.');
  }

  // Test 5: Hospital Admissions Retrieval
  console.log('\n[Test 5] Hospital Admissions Retrieval: GET /doctors/patients/:patientProfileId/admissions');
  const admRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/admissions?page=1&limit=20`,
    method: 'GET',
    headers: authHeaders
  });
  if (admRes.status === 200) {
    console.log(`✔ PASS: Hospital admissions retrieved (HTTP 200). Admissions Count: ${admRes.data?.data?.length ?? 0}`);
  } else {
    throw new Error(`FAIL: Hospital admissions returned HTTP ${admRes.status}`);
  }

  // Test 6: Clinical Timeline Retrieval
  console.log('\n[Test 6] Clinical Timeline Retrieval: GET /doctors/patients/:patientProfileId/medical-records/timeline');
  const timeRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/medical-records/timeline?page=1&limit=20`,
    method: 'GET',
    headers: authHeaders
  });
  if (timeRes.status === 200) {
    console.log(`✔ PASS: Clinical timeline retrieved (HTTP 200). Events Count: ${timeRes.data?.data?.length ?? 0}`);
  } else {
    throw new Error(`FAIL: Clinical timeline returned HTTP ${timeRes.status}`);
  }

  // Test 7: Medical Records Retrieval (SOAP Notes)
  console.log('\n[Test 7] Medical Records Retrieval: GET /doctors/patients/:patientProfileId/medical-records');
  const medRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/medical-records?page=1&limit=20`,
    method: 'GET',
    headers: authHeaders
  });
  if (medRes.status === 200) {
    console.log(`✔ PASS: Medical records retrieved (HTTP 200). Records Count: ${medRes.data?.data?.length ?? 0}`);
  } else {
    throw new Error(`FAIL: Medical records returned HTTP ${medRes.status}`);
  }

  // Test 8: TASK 1 Diagnostics — Refill Authorization Backend Defect
  console.log('\n[Test 8] TASK 1 Diagnostics — Refill Authorization: POST /prescriptions/:prescriptionId/refill');
  const refillRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/prescriptions/${createdRxId}/refill`,
    method: 'POST',
    headers: authHeaders
  }, {
    quantity: 1,
    notes: "Standard 30-day refill authorized by clinic"
  });
  console.log(`ℹ Live Endpoint HTTP Status: ${refillRes.status}`);
  console.log(`ℹ Error Body:`, JSON.stringify(refillRes.data || refillRes.raw));
  if (refillRes.status === 500) {
    console.log(`✔ DEFECT CONFIRMED: Backend throws HTTP 500 InternalServerError (Classified as BACKEND BUG FIX REQUIRED).`);
  } else if (refillRes.status === 200 || refillRes.status === 201) {
    console.log(`✔ REFILL RESOLVED: Backend returned HTTP ${refillRes.status}`);
  }

  // Test 9: TASK 1 Diagnostics — Class-Validator Verification
  console.log('\n[Test 9] TASK 1 Diagnostics — Refill Payload Validation: POST with extra field');
  const refillBadFieldRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/prescriptions/${createdRxId}/refill`,
    method: 'POST',
    headers: authHeaders
  }, {
    quantity: 1,
    notes: "Test",
    invalidExtraField: "unexpected"
  });
  console.log(`ℹ Validation Check HTTP Status: ${refillBadFieldRes.status} (Expected: 400 Bad Request)`);
  if (refillBadFieldRes.status === 400) {
    console.log(`✔ CONFIRMED: NestJS class-validator actively intercepts request before service execution.`);
  }

  // Test 10: TASK 2 Diagnostics — Individual Prescription Export Defect
  console.log('\n[Test 10] TASK 2 Diagnostics — Single Rx Export: GET /prescriptions/:prescriptionId/export');
  const exportRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/prescriptions/${createdRxId}/export`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`ℹ Live Endpoint HTTP Status: ${exportRes.status}`);
  console.log(`ℹ Error Body:`, JSON.stringify(exportRes.data || exportRes.raw));
  if (exportRes.status === 500) {
    console.log(`✔ DEFECT CONFIRMED: Backend throws HTTP 500 InternalServerError (Classified as BACKEND BUG FIX REQUIRED).`);
  } else if (exportRes.status === 200) {
    console.log(`✔ EXPORT RESOLVED: Backend returned HTTP 200`);
  }

  // Test 11: TASK 3 Diagnostics — Missing Unified Clinical Record Export
  console.log('\n[Test 11] TASK 3 Diagnostics — Unified Chart Export: GET /doctors/patients/:id/medical-records/export');
  const unifiedExportRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}/medical-records/export?format=PDF`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`ℹ Live Endpoint HTTP Status: ${unifiedExportRes.status} (Expected: 404 Not Found)`);
  if (unifiedExportRes.status === 404) {
    console.log(`✔ GENUINELY MISSING API CONFIRMED: Backend does not have this route (Classified as NEW BACKEND API REQUIRED).`);
  }

  // Test 12: Invalid Patient Profile ID
  console.log('\n[Test 12] Invalid Patient ID Handling: GET /doctors/patients/00000000-0000-0000-0000-000000000000');
  const invalidPatientRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/00000000-0000-0000-0000-000000000000`,
    method: 'GET',
    headers: authHeaders
  });
  console.log(`ℹ Invalid Patient HTTP Status: ${invalidPatientRes.status}`);
  if (invalidPatientRes.status === 404 || invalidPatientRes.status === 400) {
    console.log(`✔ PASS: Non-existent patient properly rejected with HTTP ${invalidPatientRes.status}`);
  }

  // Test 13: Unauthenticated Access Rejection
  console.log('\n[Test 13] Unauthorized Access Rejection: GET /doctors/patients/:patientProfileId (No Token)');
  const unauthRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${testPatientId}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  if (unauthRes.status === 401) {
    console.log(`✔ PASS: Unauthenticated access strictly blocked with HTTP 401 Unauthorized`);
  } else {
    throw new Error(`FAIL: Unauthenticated access returned HTTP ${unauthRes.status}`);
  }

  console.log('\n================================================================');
  console.log(' ALL 13 VERIFICATION GATES COMPLETED & DIAGNOSTICS LOGGED');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
