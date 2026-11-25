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

async function testDoctorRegistrationWithToken() {
  // Step 1: Login with +16505550006 (Staff phone without doctor profile)
  const phone = '+16505550006';
  console.log(`Getting OTP for ${phone}...`);
  const reqRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { phone });

  const challengeId = reqRes.body.challengeId;
  console.log('Challenge:', challengeId);

  const verifyRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const token = verifyRes.body.accessToken;
  console.log('Token received! Starting POST /api/v1/doctors test...');

  // Step 2: Call POST /api/v1/doctors with valid doctor DTO
  const doctorDto = {
    fullName: 'Dr. Jane Smith, MD',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1982-08-14',
    yearsOfExperience: 12,
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

  console.log('POST /api/v1/doctors status:', createRes.status);
  console.log('POST /api/v1/doctors body:', createRes.body);
}

testDoctorRegistrationWithToken().catch(console.error);

