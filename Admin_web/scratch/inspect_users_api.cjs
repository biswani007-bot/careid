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

async function testUsers() {
  const token = await getAdminToken();
  const getRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?limit=5',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('GET /api/v1/admin/users status:', getRes.status);
  console.log('GET body keys:', Object.keys(getRes.body));
  console.log('First user:', (getRes.body.users || getRes.body.data || getRes.body)[0]);
}

testUsers().catch(console.error);

