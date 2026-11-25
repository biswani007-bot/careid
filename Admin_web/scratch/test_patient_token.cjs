const https = require('https');

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testPatient() {
  const phone = '+16505550004';
  console.log('1. Requesting OTP for patient:', phone);
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ phone }));
  console.log('OTP request status:', otpRes.status, otpRes.body);

  const challengeId = otpRes.body?.challengeId || otpRes.body?.data?.challengeId;
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ challengeId, otpCode: '123456' }));
  console.log('Verify status:', verifyRes.status);
  const token = verifyRes.body?.accessToken || verifyRes.body?.data?.accessToken;
  console.log('Got patient token:', token ? 'YES' : 'NO');

  if (token) {
    console.log('\n2. Calling /api/v1/medical-records with patient token...');
    const recRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/medical-records',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Medical records status:', recRes.status);
    console.log('Medical records response:', recRes.body);

    console.log('\n3. Calling /api/v1/medical-records/timeline with patient token...');
    const tlRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/medical-records/timeline',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Timeline status:', tlRes.status);
    console.log('Timeline response:', tlRes.body);

    // Also test the 3 attachment IDs mentioned in prompt!
    const testAttIds = [
      '04d8276b-1e4f-4a8e-b53b-f322effd8430',
      '2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed',
      '666a3474-09bd-4db2-b440-5886021f04a3'
    ];
    for (const attId of testAttIds) {
      const attRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: `/api/v1/attachments/${attId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Attachment ${attId} with patient token status:`, attRes.status, attRes.body);
    }
  }
}

testPatient().catch(console.error);

