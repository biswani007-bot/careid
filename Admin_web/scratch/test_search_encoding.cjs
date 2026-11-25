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

async function getLiveToken() {
  const reqData = JSON.stringify({ phone: '+16505550002' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);
  const challengeId = otpRes.body.data?.challengeId;

  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);
  return verifyRes.body.data?.accessToken;
}

async function testSearchEncoding() {
  const token = await getLiveToken();
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  const testUrls = [
    `/api/v1/admin/users?q=${encodeURIComponent('+14155552671')}`,
    '/api/v1/admin/users?q=14155552671',
    '/api/v1/admin/users?q=6505550001',
    `/api/v1/admin/users?q=${encodeURIComponent('+16505550001')}`
  ];

  for (const p of testUrls) {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: p,
      method: 'GET',
      headers
    });
    const data = res.body.data || res.body;
    console.log(`[${res.status}] ${p} -> count: ${Array.isArray(data) ? data.length : typeof data}`);
  }
}

testSearchEncoding().catch(console.error);

