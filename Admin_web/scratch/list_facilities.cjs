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

async function listFacilities() {
  const token = await getAdminToken();
  const res = await get('/api/v1/facilities?limit=5', token);
  const facs = res.data || res;
  console.log('Facilities:', facs.map(f => ({ id: f.id, name: f.name })));
}

listFacilities().catch(console.error);

