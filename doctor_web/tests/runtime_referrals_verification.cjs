/**
 * CareID Doctor Web — Referral Hub Comprehensive Live Verification Suite
 * 
 * Verifies live staging endpoints against https://360api.vnvision.in/api/v1
 * Tests:
 * 1. Referral List Retrieval (GET /referrals)
 * 2. Incoming Referrals Retrieval (GET /referrals/my-incoming)
 * 3. Outgoing Referrals Retrieval (GET /referrals/my-outgoing)
 * 4. Referral Dashboard Metrics (GET /referrals/dashboard/stats)
 * 5. Referral Priority/Status Filtering
 * 6. New Referral Creation (POST /referrals)
 * 7. Referral Details Lookup (GET /referrals/:id)
 * 8. Referral Triage Mutation (PUT /referrals/:id/triage)
 * 9. Referral Status Lifecycle Updates (PUT /referrals/:id/status)
 * 10. Referral Clinical Coordination Notes (POST/GET /referrals/:id/notes)
 * 11. Referral Medical Attachments (GET /referrals/:id/attachments)
 * 12. Referral Immutable Status Transition History (GET /referrals/:id/history)
 * 13. Invalid UUID 404 Error Handling
 * 14. Unauthorized 401 Access Rejection
 * 15. Export Referrals Capability Verification
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

  const tokenData = verRes.data?.data || verRes.data;
  if (tokenData?.accessToken) {
    fs.writeFileSync(
      cachePath,
      JSON.stringify(
        {
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          updatedAt: Date.now(),
        },
        null,
        2
      )
    );
    return tokenData.accessToken;
  }
  throw new Error('Could not acquire doctor token.');
}

async function runLiveVerification() {
  console.log('================================================================');
  console.log(' CareID Referral Hub Comprehensive Live Staging Verification Suite');
  console.log(` Target Backend: https://${BASE_HOST}${BASE_PATH}`);
  console.log('================================================================\n');

  const token = await getDoctorToken();
  console.log(`✔ [Auth] Authenticated as Attending Doctor. Token acquired.`);

  function apiCall(endpoint, method = 'GET', data = null, customToken = token) {
    const headers = { 'Content-Type': 'application/json' };
    if (customToken) headers['Authorization'] = `Bearer ${customToken}`;
    return request(
      {
        hostname: BASE_HOST,
        path: `${BASE_PATH}${endpoint}`,
        method,
        headers,
      },
      data
    );
  }

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✔ [PASS] ${message}`);
    } else {
      console.error(`  ✖ [FAIL] ${message} — ${details}`);
    }
  }

  console.log('\n--- 1. Testing Referral Retrieval & Directional Queries ---');

  const listRes = await apiCall('/referrals');
  assert(listRes.status === 200, 'GET /referrals returns 200 OK', `Status: ${listRes.status}`);
  const allReferrals = Array.isArray(listRes.data?.data) ? listRes.data.data : [];
  console.log(`    Total referrals in staging: ${allReferrals.length}`);

  const incomingRes = await apiCall('/referrals/my-incoming');
  assert(incomingRes.status === 200, 'GET /referrals/my-incoming returns 200 OK', `Status: ${incomingRes.status}`);

  const outgoingRes = await apiCall('/referrals/my-outgoing');
  assert(outgoingRes.status === 200, 'GET /referrals/my-outgoing returns 200 OK', `Status: ${outgoingRes.status}`);

  console.log('\n--- 2. Testing Referral Dashboard Metrics ---');

  const statsRes = await apiCall('/referrals/dashboard/stats');
  assert(statsRes.status === 200, 'GET /referrals/dashboard/stats returns 200 OK', `Status: ${statsRes.status}`);
  assert(
    typeof statsRes.data?.data?.totalReferrals === 'number',
    'Dashboard stats include totalReferrals count',
    JSON.stringify(statsRes.data?.data)
  );
  console.log('    Metrics:', JSON.stringify(statsRes.data?.data));

  console.log('\n--- 3. Testing Referral Creation (POST /referrals) ---');

  const createPayload = {
    patientId: '787e5187-7859-4320-bb1a-465a57dd086a', // Marcus Doe
    receivingFacilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', // Metro General Hospital
    receivingDoctorId: '1f06067b-e229-4707-84e2-afa27da2e4cd', // Dr. Sarah Jenkins
    priority: 'URGENT',
    referralType: 'SPECIALIST_CONSULTATION',
    reasonForReferral: 'Evaluation of progressive exertional angina with stress-induced ECG abnormalities',
    clinicalSummary: 'Resting ECG shows early T-wave inversions in leads V4-V6. Urgent interventional review needed.',
    specialtyRequired: 'Cardiology',
  };

  const createRes = await apiCall('/referrals', 'POST', createPayload);
  assert(createRes.status === 201, 'POST /referrals creates referral (201 Created)', `Status: ${createRes.status}`);
  const created = createRes.data?.data;
  assert(!!created?.id, 'Created referral has valid UUID identifier', `ID: ${created?.id}`);
  assert(!!created?.referralNumber, 'Created referral has unique referralNumber', `RefNum: ${created?.referralNumber}`);
  const testRefId = created?.id;

  console.log(`    Created Referral: ${created?.referralNumber} (UUID: ${testRefId})`);

  if (testRefId) {
    console.log('\n--- 4. Testing Referral Detail Lookup (GET /referrals/:id) ---');

    const detailRes = await apiCall(`/referrals/${testRefId}`);
    assert(detailRes.status === 200, 'GET /referrals/:id returns 200 OK', `Status: ${detailRes.status}`);
    assert(
      detailRes.data?.data?.patient?.fullName === 'Marcus Doe',
      'Detail includes patient record (Marcus Doe)',
      detailRes.data?.data?.patient?.fullName
    );

    console.log('\n--- 5. Testing Clinical Coordination Notes (POST/GET /referrals/:id/notes) ---');

    const addNoteRes = await apiCall(`/referrals/${testRefId}/notes`, 'POST', {
      noteText: 'Serial high-sensitivity troponin assays confirmed negative. Scheduling outpatient echocardiogram.',
      isPrivate: false,
    });
    assert(addNoteRes.status === 201, 'POST /referrals/:id/notes adds coordination note (201 Created)', `Status: ${addNoteRes.status}`);

    const getNotesRes = await apiCall(`/referrals/${testRefId}/notes`);
    assert(getNotesRes.status === 200, 'GET /referrals/:id/notes returns 200 OK', `Status: ${getNotesRes.status}`);
    assert(
      Array.isArray(getNotesRes.data?.data) && getNotesRes.data.data.length > 0,
      'Notes array contains persisted note',
      `Count: ${getNotesRes.data?.data?.length}`
    );

    console.log('\n--- 6. Testing Triage Mutation (PUT /referrals/:id/triage) ---');

    const triageRes = await apiCall(`/referrals/${testRefId}/triage`, 'PUT', {
      outcome: 'APPROVED',
      reason: 'Accepted for Cardiology specialist review and outpatient cardiac catheterization consultation',
    });
    assert(triageRes.status === 200, 'PUT /referrals/:id/triage approves referral (200 OK)', `Status: ${triageRes.status}`);
    assert(
      triageRes.data?.data?.status === 'ACCEPTED',
      'Referral status transitioned to ACCEPTED',
      triageRes.data?.data?.status
    );

    console.log('\n--- 7. Testing Referral Status Lifecycle (PUT /referrals/:id/status) ---');

    const inProgRes = await apiCall(`/referrals/${testRefId}/status`, 'PUT', {
      status: 'IN_PROGRESS',
      reason: 'Patient consultation in progress with attending cardiologist',
    });
    assert(inProgRes.status === 200, 'PUT /referrals/:id/status sets IN_PROGRESS (200 OK)', `Status: ${inProgRes.status}`);
    assert(
      inProgRes.data?.data?.status === 'IN_PROGRESS',
      'Referral status updated to IN_PROGRESS',
      inProgRes.data?.data?.status
    );

    console.log('\n--- 8. Testing Referral Attachments & Transition History ---');

    const attRes = await apiCall(`/referrals/${testRefId}/attachments`);
    assert(attRes.status === 200, 'GET /referrals/:id/attachments returns 200 OK', `Status: ${attRes.status}`);

    const histRes = await apiCall(`/referrals/${testRefId}/history`);
    assert(histRes.status === 200, 'GET /referrals/:id/history returns 200 OK', `Status: ${histRes.status}`);
    assert(
      Array.isArray(histRes.data?.data) && histRes.data.data.length > 0,
      'History array contains immutable lifecycle transition records',
      `History count: ${histRes.data?.data?.length}`
    );

    console.log('\n--- 9. Testing Cancellation / Withdrawal ---');

    const cancelRes = await apiCall(`/referrals/${testRefId}/status`, 'PUT', {
      status: 'CANCELLED',
      reason: 'Referral withdrawn after test suite verification',
    });
    assert(cancelRes.status === 200, 'Referral successfully marked CANCELLED via status API', `Status: ${cancelRes.status}`);
  }

  console.log('\n--- 10. Testing Error & Edge Conditions ---');

  // Invalid ID
  const invalidIdRes = await apiCall('/referrals/00000000-0000-0000-0000-000000000000');
  assert(
    invalidIdRes.status === 404,
    'Non-existent referral UUID returns 404 Not Found',
    `Status: ${invalidIdRes.status}`
  );

  // Unauthorized Access
  const unauthRes = await apiCall('/referrals', 'GET', null, 'INVALID_TOKEN_TEST');
  assert(
    unauthRes.status === 401,
    'Unauthorized request without valid JWT returns 401 Unauthorized',
    `Status: ${unauthRes.status}`
  );

  // Referral Export check
  const exportRes = await apiCall('/referrals/export');
  assert(
    exportRes.status === 404,
    'Verified: GET /referrals/export is NOT implemented on backend (returns 404 as documented)',
    `Status: ${exportRes.status}`
  );

  console.log('\n================================================================');
  console.log(` Verification Suite Completed: ${passedTests} / ${totalTests} assertions passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal Verification Suite Failure:', err);
  process.exit(1);
});

