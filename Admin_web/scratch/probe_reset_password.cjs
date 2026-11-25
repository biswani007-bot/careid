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

async function testResetPassword() {
  const token = await getAdminToken();
  const getRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?limit=5',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  const users = getRes.body;
  const user = users[0];
  console.log('Testing reset on user:', user.id, user.phone, user.roles);

  console.log(`Probing POST /api/v1/admin/users/${user.id}/reset-password...`);
  const resetRes = await request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/admin/users/${user.id}/reset-password`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    newPassword: 'SecureDoctorTest123!'
  });
  console.log('Reset status:', resetRes.status);
  console.log('Reset body:', resetRes.body);
}

testResetPassword().catch(console.error);
