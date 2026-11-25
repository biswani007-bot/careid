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

async function analyzeUsers() {
  const token = await getAdminToken();
  const users = await get('/api/v1/admin/users?limit=100', token);
  console.log(`Total users: ${users.length}`);

  const rolesCount = {};
  users.forEach(u => {
    const r = (u.roles || []).join(',') || u.role || 'NONE';
    rolesCount[r] = (rolesCount[r] || 0) + 1;
  });
  console.log('Roles breakdown:', rolesCount);

  const usersWithEmail = users.filter(u => u.email);
  console.log(`Users with email: ${usersWithEmail.length}`);
  usersWithEmail.forEach(u => {
    console.log(`- ${u.email} | roles: ${(u.roles || []).join(',')} | docProfile: ${u.doctorProfileId}`);
  });

  const doctors = users.filter(u => (u.roles || []).includes('DOCTOR') || u.doctorProfileId);
  console.log(`Total users with DOCTOR role/profile: ${doctors.length}`);
}

analyzeUsers().catch(console.error);

