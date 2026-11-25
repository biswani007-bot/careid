const fs = require('fs');
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

async function getFreshToken() {
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached && cached.refreshToken) {
        const refData = JSON.stringify({ refreshToken: cached.refreshToken });
        const refRes = await httpRequest({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/token/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(refData) }
        }, refData);
        if (refRes.status === 200 && refRes.body?.data?.accessToken) {
          cached.accessToken = refRes.body.data.accessToken;
          cached.token = refRes.body.data.accessToken;
          cached.refreshToken = refRes.body.data.refreshToken || cached.refreshToken;
          cached.expiresAt = Date.now() + 14 * 60 * 1000;
          fs.writeFileSync('scratch/cached_token.json', JSON.stringify(cached, null, 2));
          return cached.accessToken;
        }
      }
      if (cached && cached.accessToken && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
        return cached.accessToken;
      }
    } catch {}
  }

  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const authData = verifyRes.body?.data;
  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  return authData.accessToken;
}

async function apiGet(path) {
  const token = await getFreshToken();
  return httpRequest({
    hostname: '360api.vnvision.in',
    path,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
}

async function apiPost(path, data) {
  const token = await getFreshToken();
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  return httpRequest({
    hostname: '360api.vnvision.in',
    path,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Accept: 'application/json'
    }
  }, body);
}

module.exports = { getFreshToken, apiGet, apiPost };

