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

async function testTestPhones() {
  const phones = [
    '+16505550003',
    '+16505550004',
    '+16505550005',
    '+16505550006',
    '+16505550007'
  ];

  for (const phone of phones) {
    const reqRes = await request('/api/v1/auth/otp/request', { phone });
    if (reqRes.body.challengeId) {
      const verifyRes = await request('/api/v1/auth/otp/verify', {
        challengeId: reqRes.body.challengeId,
        otpCode: '123456'
      });
      console.log(`Phone ${phone}: verify status ${verifyRes.status}, user ID: ${verifyRes.body?.user?.id || verifyRes.body?.id}`);
      if (verifyRes.body?.accessToken) {
        console.log(`  -> Got token! User:`, verifyRes.body.user);
      }
    } else {
      console.log(`Phone ${phone}: request OTP failed: ${reqRes.status}`);
    }
  }
}

testTestPhones().catch(console.error);

