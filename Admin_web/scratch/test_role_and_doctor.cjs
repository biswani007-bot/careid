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

async function testRoleAndDoctor() {
  const adminToken = await getAdminToken();
  const userId = 'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6';

  // 1. Assign STAFF & DOCTOR roles to user
  console.log('Assigning roles to 004 user...');
  const roleRes = await request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/admin/users/${userId}/roles`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, {
    roles: ['STAFF', 'DOCTOR']
  });
  console.log('Role assign status:', roleRes.status, 'roles:', roleRes.body?.roles);

  // 2. Request OTP and login as 004
  const reqRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { phone: '+16505550004' });

  console.log('OTP request:', reqRes.status, reqRes.body);
  if (!reqRes.body.challengeId) return;

  const verifyRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { challengeId: reqRes.body.challengeId, otpCode: '123456' });

  console.log('Verify status:', verifyRes.status, 'user roles:', verifyRes.body?.roles);
  const userToken = verifyRes.body.accessToken;

  // 3. Call POST /api/v1/doctors
  const doctorDto = {
    fullName: 'Dr. Clara Barton, MD',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'American Board of Internal Medicine',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `MD-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1985-05-18T00:00:00.000Z',
    yearsOfExperience: 15,
    department: 'Department of Cardiology'
  };

  const createRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${userToken}`
    }
  }, doctorDto);

  console.log('Create doctor status:', createRes.status);
  console.log('Create doctor body:', createRes.body);
}

testRoleAndDoctor().catch(console.error);

