const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function testEndpoint(method, path, token, body = {}) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let j;
        try { j = JSON.parse(data); } catch(e) { j = data; }
        resolve({ path, method, status: res.statusCode, body: j });
      });
    });
    req.on('error', err => resolve({ path, method, status: 'ERROR', error: err.message }));
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function probeAll() {
  const token = await getAdminToken();

  const candidates = [
    { method: 'POST', path: '/api/v1/admin/users' },
    { method: 'POST', path: '/api/v1/users' },
    { method: 'POST', path: '/api/v1/admin/doctors' },
    { method: 'POST', path: '/api/v1/doctors' },
    { method: 'POST', path: '/api/v1/doctors/create' },
    { method: 'POST', path: '/api/v1/doctors/register' },
    { method: 'POST', path: '/api/v1/admin/doctors/register' },
    { method: 'POST', path: '/api/v1/auth/register' },
    { method: 'POST', path: '/api/v1/auth/signup' },
    { method: 'POST', path: '/api/v1/auth/users' },
    { method: 'POST', path: '/api/v1/auth/admin/users' },
    { method: 'POST', path: '/api/v1/facilities' },
  ];

  for (const c of candidates) {
    const res = await testEndpoint(c.method, c.path, token, {
      fullName: 'Test Candidate',
      email: 'test@candidate.com'
    });
    console.log(`[${c.method}] ${c.path} -> Status: ${res.status} | Message: ${res.body?.message || JSON.stringify(res.body).slice(0, 80)}`);
  }
}

probeAll().catch(console.error);

