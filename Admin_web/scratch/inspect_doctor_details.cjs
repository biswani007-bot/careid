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

async function inspectDoctors() {
  const token = await getAdminToken();
  const list = await get('/api/v1/doctors?limit=5', token);
  const docs = list.data || list;
  console.log('Docs count:', docs.length);
  for (const doc of docs.slice(0, 3)) {
    const detail = await get(`/api/v1/doctors/${doc.id}`, token);
    console.log(JSON.stringify(detail, null, 2));
  }
}

inspectDoctors().catch(console.error);

