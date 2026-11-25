const https = require('https');

function request(path, postData) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    };
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
    if (postData) r.write(JSON.stringify(postData));
    r.end();
  });
}

async function testOtpFlow() {
  const reqRes = await request('/api/v1/auth/otp/request', { phone: '+16505559876' });
  console.log('Request OTP res:', reqRes.body);
  const challengeId = reqRes.body.challengeId;

  // Try common staging OTPs: '123456', '000000', '111111'
  for (const code of ['123456', '000000', '111111']) {
    console.log(`Trying OTP code: ${code}`);
    const verifyRes = await request('/api/v1/auth/otp/verify', { challengeId, otpCode: code });
    console.log('Verify res status:', verifyRes.status, 'body:', verifyRes.body);
    if (verifyRes.status === 200 || verifyRes.status === 201) break;
  }
}

testOtpFlow().catch(console.error);

