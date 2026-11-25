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

async function probe007() {
  const reqRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { phone: '+16505550007' });

  console.log('OTP req:', reqRes.status, reqRes.body);
  const challengeId = reqRes.body.challengeId || reqRes.body.data?.challengeId;
  if (!challengeId) return;

  const verifyRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const token = verifyRes.body.accessToken || verifyRes.body.data?.accessToken;
  console.log('Token:', token ? token.slice(0, 25) + '...' : 'NONE');

  // Try POST /api/v1/doctors
  const doctorDto = {
    fullName: `Dr. Probe Arthur ${Date.now()}`,
    primarySpecialization: 'Neurology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'MALE',
    dateOfBirth: '1975-05-22T00:00:00.000Z',
    yearsOfExperience: 20,
    department: 'Neurology'
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

  console.log('Create doctor status:', createRes.status);
  console.log('Create doctor body:', createRes.body);
}

probe007().catch(console.error);
