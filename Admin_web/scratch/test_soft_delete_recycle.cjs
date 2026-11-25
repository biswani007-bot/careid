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

async function testSoftDeletedUser() {
  const adminToken = await getAdminToken();

  // 1. Delete doctor 073bec8a-3720-4d8e-aa62-0526f28fb039
  const delRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/073bec8a-3720-4d8e-aa62-0526f28fb039',
    method: 'DELETE',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Delete status:', delRes.status);

  // 2. Login with +16505550004
  const reqRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { phone: '+16505550004' });

  const challengeId = reqRes.body.challengeId;
  const verifyRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const token = verifyRes.body.accessToken;

  // 3. Try POST /api/v1/doctors
  const doctorDto = {
    fullName: 'Dr. Clara Barton, MD',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1985-05-18T00:00:00.000Z',
    yearsOfExperience: 15,
    department: 'Cardiology'
  };

  const createRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, doctorDto);

  console.log('Create doctor status:', createRes.status, 'body:', createRes.body);
}

testSoftDeletedUser().catch(console.error);

