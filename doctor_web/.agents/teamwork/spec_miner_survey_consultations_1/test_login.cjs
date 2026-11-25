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
  const otpReq = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, JSON.stringify({ phone: '+16505550003' }));
  console.log('OTP Req:', otpReq.body);
  const parsed = JSON.parse(otpReq.body);
  const challengeId = parsed.data ? parsed.data.challengeId : parsed.challengeId;

  const otpVerify = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, JSON.stringify({ challengeId, otpCode: '123456' }));
  console.log('OTP Verify:', otpVerify.body);
}

run();
