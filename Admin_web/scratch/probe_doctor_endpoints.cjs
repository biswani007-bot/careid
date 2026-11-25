const fs = require('fs');
const https = require('https');

function httpRequest(options, postData) {
  return new Promise((resolve) => {
    const opts = { ...options, rejectUnauthorized: false };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  const tokenFile = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenFile.accessToken;

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const results = [];

  async function test(name, method, path, postData = null) {
    console.log(`Testing ${method} ${path}...`);
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: authHeaders
    }, postData);
    console.log(`  -> Status: ${res.status}`);
    results.push({ name, method, path, status: res.status, body: res.body });
    return res;
  }

  // 1. Doctor Directory & Stats
  const listRes = await test('Doctor List', 'GET', '/api/v1/doctors?page=1&limit=20');
  await test('Doctor Statistics', 'GET', '/api/v1/doctors/statistics');
  await test('Pending Verification Doctors', 'GET', '/api/v1/doctors/verification/pending');
  await test('Enterprise Search Doctors', 'GET', '/api/v1/doctors/search?q=Sarah');

  let sampleDoctorId = null;
  if (listRes.status === 200 && Array.isArray(listRes.body?.data)) {
    if (listRes.body.data.length > 0) {
      sampleDoctorId = listRes.body.data[0].id;
    }
  } else if (listRes.status === 200 && Array.isArray(listRes.body)) {
    if (listRes.body.length > 0) sampleDoctorId = listRes.body[0].id;
  }

  console.log('Sample Doctor ID:', sampleDoctorId);

  if (sampleDoctorId) {
    await test('Doctor Details', 'GET', `/api/v1/doctors/${sampleDoctorId}`);
    await test('Doctor Documents', 'GET', `/api/v1/doctors/${sampleDoctorId}/documents`);
    await test('Doctor History', 'GET', `/api/v1/doctors/${sampleDoctorId}/history`);
    await test('Doctor Slots', 'GET', `/api/v1/doctors/${sampleDoctorId}/slots`);
    await test('Doctor QR Code', 'POST', `/api/v1/doctors/${sampleDoctorId}/generate-qr`);
  }

  // Check admin doctor creation endpoint
  await test('Admin Create Doctor for User (Probe Schema/Validation)', 'POST', '/api/v1/admin/doctors', {});

  // Facilities
  const facRes = await test('List Facilities', 'GET', '/api/v1/facilities?limit=5');
  let sampleFacilityId = null;
  if (facRes.status === 200 && facRes.body?.data && facRes.body.data.length > 0) {
    sampleFacilityId = facRes.body.data[0].id;
  }
  if (sampleFacilityId) {
    await test('Facility Doctors', 'GET', `/api/v1/facilities/${sampleFacilityId}/doctors`);
  }

  fs.writeFileSync('scratch/probe_doctor_endpoints_results.json', JSON.stringify(results, null, 2));
  console.log('Probing completed! Saved to scratch/probe_doctor_endpoints_results.json');
}

run();

