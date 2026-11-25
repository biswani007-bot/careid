const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function testUserKeys() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?limit=5',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      console.log('Sample user from /api/v1/admin/users:', JSON.stringify(j.data?.[0] || j[0], null, 2));
    });
  });
}

testUserKeys();

