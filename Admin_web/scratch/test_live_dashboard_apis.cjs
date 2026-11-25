const https = require('https');
const fs = require('fs');

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
  return verifyRes.body.data?.accessToken;
}

async function run() {
  console.log('Authenticating with live backend...');
  const token = await getLiveToken();
  console.log('Token acquired:', token ? token.slice(0, 20) + '...' : 'NONE');

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const endpointsToTest = [
    { name: 'Health Check', path: '/api/v1/health' },
    { name: 'Observability Health', path: '/api/v1/observability/health' },
    { name: 'Observability Live', path: '/api/v1/observability/health/live' },
    { name: 'Observability Ready', path: '/api/v1/observability/health/ready' },
    { name: 'Observability Dashboard', path: '/api/v1/observability/dashboard' },
    { name: 'Admin Dashboard Stats', path: '/api/v1/admin/dashboard/stats' },
    { name: 'Admin Dashboard Summary', path: '/api/v1/admin/dashboard/summary' },
    { name: 'Referral Dashboard Stats', path: '/api/v1/referrals/dashboard/stats' },
    { name: 'OCR Dashboard', path: '/api/v1/ocr/dashboard' },
    { name: 'Doctors Statistics', path: '/api/v1/doctors/statistics' },
    { name: 'Admin Audit Logs', path: '/api/v1/admin/audit-logs' },
    { name: 'Security Audit', path: '/api/v1/security/audit' },
    { name: 'OCR Queue Pending', path: '/api/v1/ocr/reviews/pending?page=1&limit=5' },
    { name: 'Referrals List (Pending)', path: '/api/v1/referrals?status=PENDING&page=1&limit=5' },
    { name: 'Referrals Queue', path: '/api/v1/referrals/queue' },
    { name: 'Auth Sessions', path: '/api/v1/auth/sessions' }
  ];

  for (const ep of endpointsToTest) {
    try {
      const res = await httpRequest({
        hostname: '360api.vnvision.in',
        path: ep.path,
        method: 'GET',
        headers
      });
      console.log(`\n--------------------------------------------------`);
      console.log(`[${res.status}] ${ep.name} (${ep.path})`);
      console.log(JSON.stringify(res.body, null, 2));
    } catch (err) {
      console.log(`\n[ERROR] ${ep.name}:`, err.message);
    }
  }
}

run();

