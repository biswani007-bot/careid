const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    r.end();
  });
}

async function runInvestigation() {
  const adminToken = await getAdminToken();

  console.log('=== TEST 1: Admin Token calling POST /api/v1/doctors ===');
  const payload1 = {
    fullName: `Dr. Unique Test One ${Date.now()}`,
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-UNIQ-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-UNIQ-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1985-05-18T00:00:00.000Z',
    yearsOfExperience: 10,
    department: 'Department of Cardiology'
  };

  const res1 = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, payload1);

  console.log('Test 1 Status:', res1.status);
  console.log('Test 1 Body:', JSON.stringify(res1.body, null, 2));

  console.log('\n=== TEST 2: Inspecting Token Identity (GET /api/v1/auth/me) ===');
  const meRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Auth Me:', JSON.stringify(meRes.body, null, 2));

  console.log('\n=== TEST 3: Check if Admin User already has Doctor Profile ===');
  const meData = meRes.body?.data || meRes.body;
  const adminUserId = meData?.id;
  console.log('Admin User ID:', adminUserId);

  const docsRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors?limit=50',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  const docs = docsRes.body?.data || docsRes.body;
  const adminDoctor = (Array.isArray(docs) ? docs : []).find(d => d.userId === adminUserId);
  console.log('Admin linked doctor profile in /api/v1/doctors:', adminDoctor ? {
    id: adminDoctor.id,
    fullName: adminDoctor.fullName,
    userId: adminDoctor.userId
  } : 'NONE');
}

runInvestigation().catch(console.error);

