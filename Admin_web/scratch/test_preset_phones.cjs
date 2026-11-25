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

async function testPresetNumbers() {
  const numbers = [
    '+16505550003',
    '+16505550004',
    '+16505550006',
    '+16505550007'
  ];

  for (const phone of numbers) {
    console.log(`\n--- Testing ${phone} ---`);
    const reqRes = await request('/api/v1/auth/otp/request', { phone });
    console.log('OTP request status:', reqRes.status, 'body:', reqRes.body);
    if (reqRes.body.challengeId) {
      const verifyRes = await request('/api/v1/auth/otp/verify', {
        challengeId: reqRes.body.challengeId,
        otpCode: '123456'
      });
      console.log('Verify status:', verifyRes.status, 'body:', verifyRes.body);
    }
  }
}

testPresetNumbers().catch(console.error);

