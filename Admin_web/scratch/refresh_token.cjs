const fs = require('fs');
const https = require('https');
const path = require('path');

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

async function refresh() {
  console.log('Requesting OTP for +16505550001...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  if (!otpRes.body?.data?.challengeId) {
    console.error('Failed to get challengeId:', otpRes);
    return;
  }

  const challengeId = otpRes.body.data.challengeId;
  console.log('Got challengeId:', challengeId);

  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  if (!verifyRes.body?.data?.accessToken) {
    console.error('Failed to verify OTP:', verifyRes);
    return;
  }

  const authData = verifyRes.body.data;
  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    user: authData.user,
    expiresAt: Date.now() + 15 * 60 * 1000
  };

  fs.writeFileSync(path.join(__dirname, 'cached_token.json'), JSON.stringify(tokenPayload, null, 2));
  console.log('Successfully saved fresh Super Admin token to scratch/cached_token.json!');
}

refresh();

