const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function request(options, postData) {
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
    if (postData) r.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    r.end();
  });
}

async function testCandidateRoutes() {
  const token = await getAdminToken();

  const candidates = [
    { method: 'POST', path: '/api/v1/auth/signup' },
    { method: 'POST', path: '/api/v1/auth/register' },
    { method: 'POST', path: '/api/v1/auth/register/doctor' },
    { method: 'POST', path: '/api/v1/auth/doctor/register' },
    { method: 'POST', path: '/api/v1/auth/doctor/login' },
    { method: 'POST', path: '/api/v1/doctors/register' },
    { method: 'POST', path: '/api/v1/admin/doctor' },
    { method: 'POST', path: '/api/v1/staff' },
    { method: 'POST', path: '/api/v1/admin/staff' },
    { method: 'POST', path: '/api/v1/facilities/doctors' },
    { method: 'POST', path: '/api/v1/facilities/1/doctors' },
  ];

  for (const c of candidates) {
    const res = await request({
      hostname: '360api.vnvision.in',
      path: c.path,
      method: c.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {});
    console.log(`${c.method} ${c.path} -> ${res.status} (${res.body?.message || res.body?.error || ''})`);
  }
}

testCandidateRoutes().catch(console.error);

