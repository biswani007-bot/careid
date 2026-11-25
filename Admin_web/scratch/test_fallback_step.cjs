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

async function testFallback() {
  const fallbackPhones = ['+16505550006', '+16505550007', '+16505550004'];
  for (const testPhone of fallbackPhones) {
    console.log(`Trying ${testPhone}...`);
    const reqRes = await request('/api/v1/auth/otp/request', { phone: testPhone });
    console.log('OTP request status:', reqRes.status, 'body:', reqRes.body);
    const challengeId = reqRes.body?.challengeId;
    if (challengeId) {
      const verifyRes = await request('/api/v1/auth/otp/verify', { challengeId, otpCode: '123456' });
      console.log('Verify status:', verifyRes.status, 'body keys:', Object.keys(verifyRes.body));
      const token = verifyRes.body?.accessToken;
      console.log('Token:', token ? token.slice(0, 20) + '...' : 'NONE');
    }
  }
}

testFallback().catch(console.error);

