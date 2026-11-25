const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      rejectUnauthorized: false
    };
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function findUser() {
  const token = await getAdminToken();
  const users = await get('/api/v1/admin/users?limit=100', token);
  const u = users.find(x => x.id === '74e82159-f90e-4695-9c61-a3feb2997a11');
  console.log('User:', u);
}

findUser().catch(console.error);

