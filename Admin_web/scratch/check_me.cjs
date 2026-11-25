const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function checkMe() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Me:', d));
  });
}

checkMe();
