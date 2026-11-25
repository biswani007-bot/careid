const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function apiGet(path) {
  return new Promise((resolve) => {
    https.get('https://360api.vnvision.in' + path, {
      headers: { 'Authorization': 'Bearer ' + tokenData.token }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ path, status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ path, status: res.statusCode, text: data }); }
      });
    }).on('error', err => resolve({ path, error: err.message }));
  });
}

async function run() {
  const tests = [
    '/api/v1/admin/users?page=1&limit=5',
    '/api/v1/admin/users?page=2&limit=5',
    '/api/v1/admin/users?q=16505550004',
    '/api/v1/admin/users?q=Marcus',
    '/api/v1/admin/users?q=Chen',
    '/api/v1/admin/users?status=ACTIVE',
    '/api/v1/admin/users?status=BLOCKED',
    '/api/v1/admin/users?role=DOCTOR',
    '/api/v1/admin/users?role=PATIENT',
    '/api/v1/admin/users?role=ADMIN',
  ];

  for (const p of tests) {
    const res = await apiGet(p);
    const count = Array.isArray(res.body?.data) ? res.body.data.length : 'N/A';
    const total = res.body?.meta?.totalItems ?? res.body?.meta?.total ?? 'N/A';
    console.log(p.padEnd(45), '-> Status:', res.status, '| Returned count:', count, '| Total meta:', total);
    if (Array.isArray(res.body?.data) && res.body.data.length > 0 && res.body.data.length <= 3) {
      console.log('   Items:', res.body.data.map(u => u.phone + ' (' + u.roles?.join(',') + ')').join(', '));
    }
  }
}

run();
