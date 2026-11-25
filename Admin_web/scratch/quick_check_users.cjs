const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function check() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?limit=10',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Response:', d.slice(0, 300)));
  });
}
check();

