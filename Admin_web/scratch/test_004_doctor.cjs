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

async function test004Doctor() {
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

  const doctorDto = {
    fullName: 'Dr. Test 004',
    primarySpecialization: 'Pediatrics',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1989-03-21T00:00:00.000Z',
    yearsOfExperience: 8,
    department: 'Pediatrics'
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

  console.log('004 Doctor status:', createRes.status, 'body:', createRes.body);
}

test004Doctor().catch(console.error);

