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
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve(d); }
      });
    }).on('error', reject);
  });
}

async function findCandidateUsers() {
  const token = await getAdminToken();
  const usersRes = await get('/api/v1/admin/users?limit=100', token);
  const users = usersRes.data?.data || usersRes.data || (Array.isArray(usersRes) ? usersRes : []);
  const docsRes = await get('/api/v1/doctors?limit=100', token);
  const docs = docsRes.data?.data || docsRes.data || (Array.isArray(docsRes) ? docsRes : []);
  const docUserIds = new Set(docs.map(d => d.userId));

  console.log(`Total users: ${users.length}, Total doctors: ${docs.length}`);
  const candidates = users.filter(u => u.phone && u.phone.startsWith('+1650555') && !docUserIds.has(u.id) && !u.doctorProfileId);
  console.log(`Candidate 650 users without doctor profile: ${candidates.length}`);
  candidates.forEach(u => console.log(u.id, u.phone, u.roles));
}

findCandidateUsers().catch(console.error);
