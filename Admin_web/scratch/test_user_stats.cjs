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

async function testUserStatsEndpoints() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  const candidates = [
    '/api/v1/admin/users/stats',
    '/api/v1/admin/users/statistics',
    '/api/v1/admin/users/summary',
    '/api/v1/admin/users/count'
  ];

  for (const c of candidates) {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: c,
      method: 'GET',
      headers
    });
    console.log(`[${res.status}] ${c} ->`, JSON.stringify(res.body).slice(0, 100));
  }
}

testUserStatsEndpoints().catch(console.error);

