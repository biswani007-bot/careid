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

async function listUsersWithoutDoctor() {
  const token = await getAdminToken();
  const users = await get('/api/v1/admin/users?limit=100', token);
  const without = users.filter(u => !u.doctorProfileId);
  console.log(`Users without doctorProfileId: ${without.length}`);
  without.slice(0, 10).forEach(u => console.log(u.id, u.phone, u.roles));
}

listUsersWithoutDoctor().catch(console.error);

