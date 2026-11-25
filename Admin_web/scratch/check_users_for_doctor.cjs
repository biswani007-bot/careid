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

async function checkUsers() {
  const token = await getAdminToken();
  const usersRes = await get('/api/v1/admin/users?limit=100', token);
  const users = usersRes.data || usersRes;
  console.log('Total users:', users.length);
  
  // Find users without doctor profile and without patient profile
  const usersWithoutDoctor = users.filter(u => !u.doctorProfileId);
  console.log('Users without doctor profile:', usersWithoutDoctor.length);
  usersWithoutDoctor.slice(0, 10).forEach(u => {
    console.log(`User ID: ${u.id}, role: ${u.role}, email: ${u.email}, phone: ${u.phone}, docId: ${u.doctorProfileId}, patientId: ${u.patientProfileId}`);
  });
}

checkUsers().catch(console.error);

