const https = require('https');

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

async function test002Doctor() {
  const reqRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { phone: '+16505550002' });

  console.log('OTP req:', reqRes.status, reqRes.body);
  if (!reqRes.body.challengeId) return;

  const verifyRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { challengeId: reqRes.body.challengeId, otpCode: '123456' });

  console.log('Verify:', verifyRes.status, 'roles:', verifyRes.body?.roles);
  const token = verifyRes.body.accessToken;

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
      'Authorization': `Bearer ${token}`
    }
  }, doctorDto);

  console.log('Create doctor status:', createRes.status, 'body:', createRes.body);
}

test002Doctor().catch(console.error);

