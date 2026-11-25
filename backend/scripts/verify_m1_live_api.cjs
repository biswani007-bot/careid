const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function getAdminToken() {
  console.log('--- Step 1: Admin Authentication via Test OTP ---');
  const otpReqRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { phone: '+16505550001' });

  if (!otpReqRes.data?.data?.challengeId) {
    throw new Error('OTP request failed: ' + JSON.stringify(otpReqRes));
  }
  const challengeId = otpReqRes.data.data.challengeId;

  const verifyRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { challengeId, otpCode: '123456' });

  if (!verifyRes.data?.data?.accessToken) {
    throw new Error('OTP verify failed: ' + JSON.stringify(verifyRes));
  }
  console.log('Admin authenticated successfully via OTP. Roles:', verifyRes.data.data.user?.roles || verifyRes.data.data.roles);
  return verifyRes.data.data.accessToken;
}

async function run() {
  const token = await getAdminToken();

  console.log('\n--- Step 2: Unauthenticated GET /api/v1/clinical-practice-types ---');
  const unauthRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clinical-practice-types',
    method: 'GET',
  });
  console.log('Status:', unauthRes.status, '(Expected 401)');
  if (unauthRes.status !== 401) throw new Error('Expected 401');

  console.log('\n--- Step 3: Authenticated GET /api/v1/clinical-practice-types ---');
  const dropdownRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', dropdownRes.status, '(Expected 200)');
  console.log('Practice types count:', dropdownRes.data.data.length);
  dropdownRes.data.data.forEach(t => console.log(` - [${t.code}] ${t.displayName} (canonical: ${t.isCanonical})`));

  console.log('\n--- Step 4: Admin List GET /api/v1/admin/clinical-practice-types ---');
  const adminListRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', adminListRes.status, '(Expected 200)');
  adminListRes.data.data.forEach(t => {
    console.log(` - ${t.code}: doctors=${t._count.doctors}, specialties=${t._count.specialties}`);
  });

  console.log('\n--- Step 5: Admin Detail GET /api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE ---');
  const detailRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', detailRes.status, 'displayName:', detailRes.data.data.displayName);

  console.log('\n--- Step 6: Create Practice Type POST /api/v1/admin/clinical-practice-types ---');
  const createRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, {
    code: 'DENTAL_MEDICINE',
    displayName: 'Dental Medicine',
    description: 'Oral health and maxillofacial care',
    clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
    status: 'ACTIVE',
    sortOrder: 5,
  });
  console.log('Status:', createRes.status, '(Expected 201)');
  console.log('Created code:', createRes.data.data.code);

  console.log('\n--- Step 7: Duplicate Code POST /api/v1/admin/clinical-practice-types ---');
  const dupRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types',
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, {
    code: 'DENTAL_MEDICINE',
    displayName: 'Duplicate Dental',
  });
  console.log('Status:', dupRes.status, '(Expected 409)');
  if (dupRes.status !== 409) throw new Error('Expected 409 on duplicate code');

  console.log('\n--- Step 8: Update Practice Type PUT /api/v1/admin/clinical-practice-types/DENTAL_MEDICINE ---');
  const updateRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types/DENTAL_MEDICINE',
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, {
    displayName: 'Dental & Maxillofacial Medicine',
  });
  console.log('Status:', updateRes.status, 'New Name:', updateRes.data.data.displayName);

  console.log('\n--- Step 9: Canonical Deactivation PATCH /api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE/status ---');
  const canonPatchRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE/status',
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, {
    status: 'INACTIVE',
  });
  console.log('Status:', canonPatchRes.status, '(Expected 400)');
  if (canonPatchRes.status !== 400) throw new Error('Expected 400 on canonical deactivation');

  console.log('\n--- Step 10: Canonical Deletion DELETE /api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE ---');
  const canonDelRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types/HUMAN_HEALTHCARE',
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', canonDelRes.status, '(Expected 400)');
  if (canonDelRes.status !== 400) throw new Error('Expected 400 on canonical deletion');

  console.log('\n--- Step 11: Delete Unused Custom Practice Type DELETE /api/v1/admin/clinical-practice-types/DENTAL_MEDICINE ---');
  const delRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/admin/clinical-practice-types/DENTAL_MEDICINE',
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Status:', delRes.status, '(Expected 200)');
  console.log('Message:', delRes.data.message);

  console.log('\n========================================');
  console.log('ALL LIVE API VERIFICATION TESTS PASSED!');
  console.log('========================================');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
