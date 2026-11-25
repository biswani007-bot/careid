const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function request(options) {
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
    r.end();
  });
}

async function delDoctor() {
  const token = await getAdminToken();
  const res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/7b03c487-4c01-4219-90ab-23c14abebfe7',
    method: 'DELETE',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('Delete status:', res.status, res.body);
}

delDoctor().catch(console.error);

