const https = require('https');

function httpRequest(options, postData) {
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
    if (postData) r.write(postData);
    r.end();
  });
}

async function testOtp(phone) {
  console.log('Testing OTP for phone:', phone);
  const reqData = JSON.stringify({ phone });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);
  console.log('OTP res:', otpRes.status, JSON.stringify(otpRes.body));
  if (otpRes.body.data?.challengeId) {
    const challengeId = otpRes.body.data.challengeId;
    const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
    const verifyRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
    }, verifyData);
    console.log('Verify res:', verifyRes.status, 'Token:', verifyRes.body.data?.accessToken ? 'YES' : 'NO');
    return verifyRes.body.data?.accessToken;
  }
  return null;
}

testOtp('+16505550002').catch(console.error);

