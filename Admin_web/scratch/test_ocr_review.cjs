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

async function run() {
  const reqData = JSON.stringify({ phone: '+16505550001' });
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
  const token = verifyRes.body.data?.accessToken;

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const eps = [
    '/api/v1/ocr/review',
    '/api/v1/ocr/jobs',
    '/api/v1/ocr/jobs?status=REVIEW_REQUIRED',
    '/api/v1/ocr/jobs?status=PENDING'
  ];

  for (const ep of eps) {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: ep,
      method: 'GET',
      headers
    });
    console.log(`\n=== [${res.status}] ${ep} ===`);
    console.log(JSON.stringify(res.body, null, 2));
  }
}

run();

