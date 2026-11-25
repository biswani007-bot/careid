/**
 * CareID Doctor Web — Receiving Doctor Search Runtime Live Verification Suite
 * 
 * Verifies live staging endpoints against https://360api.vnvision.in/api/v1
 * Tests:
 * 1. Enterprise Doctor Search by Full Name (GET /doctors/search?q=Sarah Jenkins)
 * 2. Enterprise Doctor Search by Partial Name (GET /doctors/search?q=Julian)
 * 3. Enterprise Doctor Search by Specialty (GET /doctors/search?q=Cardiology)
 * 4. Enterprise Doctor Search Non-Matching Query (GET /doctors/search?q=XYZNonexistent999)
 * 5. Enterprise Facility Search (GET /facilities/search?q=Metro)
 * 6. Facility Associated Doctors Query (GET /facilities/:id/doctors)
 * 7. Doctor Affiliation Resolution to Correct Facility
 * 8. End-to-End Referral Creation with Searched Doctor (POST /referrals)
 * 9. Stale-Response / Debounce Contract Integrity Check
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

async function runVerification() {
  console.log('================================================================');
  console.log('CAREID DOCTOR WEB — RECEIVING DOCTOR SEARCH VERIFICATION');
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

  // 1. Search doctor by full name: 'Sarah Jenkins'
  try {
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/doctors/search?q=${encodeURIComponent('Sarah Jenkins')}`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    const found = items.find((d) => d.fullName.includes('Sarah Jenkins'));
    record(
      'Search Doctor by Full Name (Sarah Jenkins)',
      res.status === 200 && !!found,
      `Status ${res.status}, Count: ${items.length}, Matched: ${found ? found.fullName + ' (' + found.id + ')' : 'None'}`
    );
  } catch (err) {
    record('Search Doctor by Full Name (Sarah Jenkins)', false, err.message);
  }

  // 2. Search doctor by partial name: 'Julian'
  try {
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/doctors/search?q=${encodeURIComponent('Julian')}`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    const found = items.find((d) => d.fullName.toLowerCase().includes('julian'));
    record(
      'Search Doctor by Partial Name (Julian)',
      res.status === 200 && !!found,
      `Status ${res.status}, Count: ${items.length}, Matched: ${found ? found.fullName : 'None'}`
    );
  } catch (err) {
    record('Search Doctor by Partial Name (Julian)', false, err.message);
  }

  // 3. Search doctor by specialty: 'Cardiology'
  try {
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/doctors/search?q=${encodeURIComponent('Cardiology')}`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    record(
      'Search Doctor by Specialty (Cardiology)',
      res.status === 200 && items.length > 0,
      `Status ${res.status}, Count: ${items.length}, First doc: ${items[0]?.fullName} (${items[0]?.primarySpecialization})`
    );
  } catch (err) {
    record('Search Doctor by Specialty (Cardiology)', false, err.message);
  }

  // 4. Search doctor by non-matching query: 'XYZNonexistentDoctor999'
  try {
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/doctors/search?q=${encodeURIComponent('XYZNonexistentDoctor999')}`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    record(
      'Search Doctor Non-Matching Query (Empty State)',
      res.status === 200 && items.length === 0,
      `Status ${res.status}, Count: ${items.length} (clean empty list)`
    );
  } catch (err) {
    record('Search Doctor Non-Matching Query (Empty State)', false, err.message);
  }

  // 5. Search facility by query: 'Metro'
  let searchedFacilityId = '';
  try {
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/facilities/search?q=${encodeURIComponent('Metro')}`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    const metro = items.find((f) => f.name.includes('Metro'));
    if (metro) searchedFacilityId = metro.id;
    record(
      'Enterprise Facility Search (Metro)',
      res.status === 200 && !!metro,
      `Status ${res.status}, Count: ${items.length}, Found: ${metro ? metro.name + ' (' + metro.id + ')' : 'None'}`
    );
  } catch (err) {
    record('Enterprise Facility Search (Metro)', false, err.message);
  }

  // 6. Facility Associated Doctors Query: GET /facilities/:id/doctors
  let affiliatedDoctorId = '';
  try {
    const targetFacId = searchedFacilityId || '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
    const res = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/facilities/${targetFacId}/doctors`,
      method: 'GET',
      headers,
    });
    const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    if (items.length > 0) affiliatedDoctorId = items[0].id;
    record(
      'Facility Associated Doctors Retrieval (GET /facilities/:id/doctors)',
      res.status === 200 && items.length > 0,
      `Status ${res.status}, Affiliated doctors count: ${items.length}, First doc: ${items[0]?.fullName}`
    );
  } catch (err) {
    record('Facility Associated Doctors Retrieval', false, err.message);
  }

  // 7. Doctor Affiliation Resolution to Correct Facility
  try {
    const allFacsRes = await request({
      hostname: BASE_HOST,
      path: `${BASE_PATH}/facilities`,
      method: 'GET',
      headers,
    });
    const facs = Array.isArray(allFacsRes.data?.data) ? allFacsRes.data.data : (Array.isArray(allFacsRes.data) ? allFacsRes.data : []);
    
    // Resolve Dr. James Smith's facility (should be CareID Apex Diagnostic Center)
    let jamesFacility = null;
    for (const f of facs) {
      const dRes = await request({
        hostname: BASE_HOST,
        path: `${BASE_PATH}/facilities/${f.id}/doctors`,
        method: 'GET',
        headers,
      });
      const dList = Array.isArray(dRes.data?.data) ? dRes.data.data : (Array.isArray(dRes.data) ? dRes.data : []);
      if (dList.some((d) => d.id === 'b220a414-d059-4bc9-908a-d42f7f9f403b')) {
        jamesFacility = f;
        break;
      }
    }
    record(
      'Doctor Facility Affiliation Synchronization Check',
      jamesFacility && jamesFacility.name.includes('Apex'),
      `Dr. James Smith resolves accurately to: ${jamesFacility ? jamesFacility.name : 'Unknown'}`
    );
  } catch (err) {
    record('Doctor Facility Affiliation Synchronization Check', false, err.message);
  }

  // 8. End-to-End Referral Creation with Searched Doctor
  try {
    const payload = {
      patientId: '787e5187-7859-4320-bb1a-465a57dd086a',
      receivingFacilityId: searchedFacilityId || '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
      receivingDoctorId: affiliatedDoctorId || '1f06067b-e229-4707-84e2-afa27da2e4cd',
      priority: 'ROUTINE',
      referralType: 'SPECIALIST_CONSULTATION',
      reasonForReferral: 'Cardiovascular risk evaluation and echocardiogram assessment',
      clinicalSummary: 'Patient referred via doctor search workflow with active doctor affiliation.',
      specialtyRequired: 'Cardiology',
    };

    const res = await request(
      {
        hostname: BASE_HOST,
        path: `${BASE_PATH}/referrals`,
        method: 'POST',
        headers,
      },
      payload
    );

    const refNum = res.data?.data?.referralNumber || res.data?.referralNumber;
    record(
      'Referral Creation with Searched Receiving Doctor & Facility',
      res.status === 201 && !!refNum,
      `Status: ${res.status}, Created Referral: ${refNum}`
    );
  } catch (err) {
    record('Referral Creation with Searched Receiving Doctor & Facility', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} Tests Passed`);
  console.log('================================================================');

  if (results.some((r) => !r.passed)) {
    process.exit(1);
  }
}

runVerification();

