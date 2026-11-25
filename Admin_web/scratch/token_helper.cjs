const https = require('https');
const fs = require('fs');
const path = require('path');

const tokenFile = path.join(__dirname, 'cached_admin_token.json');

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

async function verifyToken(token) {
  if (!token) return false;
  try {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/me',
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    return res.status === 200 && (res.body?.id || res.body?.success);
  } catch (e) {
    return false;
  }
}

async function getAdminToken() {
  if (fs.existsSync(tokenFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      if (cached.token && (await verifyToken(cached.token))) {
        return cached.token;
      }
    } catch (e) {}
  }

  // Request new token
  const phones = ['+16505550002', '+16505550001'];
  for (const phone of phones) {
    try {
      const reqData = JSON.stringify({ phone });
      const otpRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/request',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
      }, reqData);
      const challengeId = otpRes.body?.challengeId || otpRes.body?.data?.challengeId;
      if (!challengeId) continue;

      const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
      const verifyRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, verifyData);

      const token = verifyRes.body?.accessToken || verifyRes.body?.data?.accessToken;
      if (token) {
        fs.writeFileSync(tokenFile, JSON.stringify({ token, createdAt: Date.now() }), 'utf8');
        return token;
      }
    } catch (e) {}
  }

  throw new Error('Could not acquire admin token');
}

module.exports = { httpRequest, getAdminToken };

if (require.main === module) {
  getAdminToken().then(t => console.log('Token ready:', t ? t.slice(0, 25) + '...' : 'NONE')).catch(console.error);
}

