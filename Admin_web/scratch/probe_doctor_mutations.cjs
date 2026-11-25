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

  const sampleDocId = '7c8fd004-cba1-4a72-9db6-437fc6d2baed';

  async function test(name, method, path, postData = null) {
    console.log(`Testing ${method} ${path}...`);
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: authHeaders
    }, postData);
    console.log(`  -> Status: ${res.status}`, JSON.stringify(res.body)?.slice(0, 150));
    return res;
  }

  // Test PUT /api/v1/doctors/:id with empty body or partial update
  await test('Doctor Update (PUT probe)', 'PUT', `/api/v1/doctors/${sampleDocId}`, {
    department: "Outpatient Care"
  });

  // Test POST /api/v1/doctors/:id/verify probe
  await test('Doctor Verify (POST probe)', 'POST', `/api/v1/doctors/${sampleDocId}/verify`, {
    reason: "Administrative verification check"
  });

  // Test POST /api/v1/doctors/:id/renew-license probe
  await test('Doctor Renew License (POST probe)', 'POST', `/api/v1/doctors/${sampleDocId}/renew-license`, {
    newExpiryDate: "2029-12-31",
    reason: "License renewal check"
  });

  // Test POST /api/v1/doctors/:id/suspend probe
  // Don't actually suspend unless we restore right after or check validation
  // Let's check with empty body to see if route exists
  await test('Doctor Suspend (POST probe with empty body to check validation)', 'POST', `/api/v1/doctors/${sampleDocId}/suspend`, {});

  // Facilities assign doctor
  const facId = 'f12c37e8-cfc9-4896-992c-82d954905c46';
  await test('Assign Doctor to Facility (POST probe)', 'POST', `/api/v1/facilities/${facId}/assign-doctor`, {
    doctorId: sampleDocId,
    departmentId: "7c718d5b-a26d-462a-92ef-886bf8331a13",
    role: "ATTENDING_PHYSICIAN"
  });
}

run();

