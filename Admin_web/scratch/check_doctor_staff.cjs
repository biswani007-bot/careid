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

async function checkDoctors() {
  const token = await getAdminToken();
  const doctorsRes = await get('/api/v1/doctors?limit=50', token);
  const docs = doctorsRes.data || doctorsRes;
  console.log('Doctors count in /api/v1/doctors:', docs.length);
  const found = docs.find(d => d.fullName.includes('Test Staff Doctor') || d.id === '68214521-e30b-4f4e-b2a5-d176e8570592');
  console.log('Found in /api/v1/doctors?', found ? 'YES' : 'NO');
}

checkDoctors().catch(console.error);

