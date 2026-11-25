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

async function testRestore() {
  const token = await getAdminToken();
  const res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/df2f1bfb-28bd-4d05-8b55-fa58b7350983/restore',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    reason: 'Restoring doctor'
  });
  console.log('Restore status:', res.status, 'body:', res.body);
}

testRestore().catch(console.error);

