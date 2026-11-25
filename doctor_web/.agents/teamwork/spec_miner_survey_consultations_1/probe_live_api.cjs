const https = require('https');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('Requesting OTP for Doctor phone: +16505550003...');
  const otpReq = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify({ phone: '+16505550003' }));
  console.log(`OTP request: ${otpReq.statusCode} ${otpReq.body}`);

  let parsed = JSON.parse(otpReq.body);
  const challengeId = parsed.data ? parsed.data.challengeId : parsed.challengeId;
  console.log(`Challenge ID: ${challengeId}`);

  console.log('Verifying OTP with otpCode: 123456...');
  const otpVerify = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify({
    challengeId: challengeId,
    otpCode: '123456'
  }));
  console.log(`OTP verify: ${otpVerify.statusCode} ${otpVerify.body}`);

  const verifyData = JSON.parse(otpVerify.body);
  const token = verifyData.data ? (verifyData.data.accessToken || verifyData.data.token) : verifyData.accessToken;
  console.log('Token acquired:', token ? token.slice(0, 30) + '...' : 'none');

  if (token) {
    // 1. GET treatment offers
    console.log('\n--- GET /api/v1/doctors/treatment-offers ---');
    const toRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/doctors/treatment-offers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${toRes.statusCode}`);
    console.log(`Body: ${toRes.body}`);

    // 2. GET appointments/doctor/me
    console.log('\n--- GET /api/v1/appointments/doctor/me ---');
    const apptRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/appointments/doctor/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${apptRes.statusCode}`);
    console.log(`Body: ${apptRes.body}`);

    // 3. GET financing options
    console.log('\n--- GET /api/v1/financing/options ---');
    const finRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/financing/options',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${finRes.statusCode}`);
    console.log(`Body: ${finRes.body}`);

    // 4. GET financing offers
    console.log('\n--- GET /api/v1/financing/offers ---');
    const finOffersRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/financing/offers',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${finOffersRes.statusCode}`);
    console.log(`Body: ${finOffersRes.body}`);

    // 5. GET financing applications
    console.log('\n--- GET /api/v1/financing/applications ---');
    const finAppRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/financing/applications',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${finAppRes.statusCode}`);
    console.log(`Body: ${finAppRes.body}`);

    // 6. GET doctors/me
    console.log('\n--- GET /api/v1/doctors/me ---');
    const docMe = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/doctors/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${docMe.statusCode}`);
    console.log(`Body: ${docMe.body}`);

    // 7. GET doctors/patients
    console.log('\n--- GET /api/v1/doctors/patients ---');
    const docPatients = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/doctors/patients',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Status: ${docPatients.statusCode}`);
    console.log(`Body: ${docPatients.body}`);
  }
}

run().catch(console.error);
