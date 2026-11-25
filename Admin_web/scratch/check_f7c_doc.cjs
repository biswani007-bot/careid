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

async function checkDoc() {
  const token = await getAdminToken();
  const doc = await get('/api/v1/doctors/f7c78c3e-4072-4e15-bce9-fe403442c76b', token);
  console.log('Doctor f7c...:', doc);
}

checkDoc().catch(console.error);

