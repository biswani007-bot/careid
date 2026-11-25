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

async function findUsers() {
  const token = await getAdminToken();
  const users = await get('/api/v1/admin/users?limit=100', token);
  const targetUserIds = [
    '1b54eef2-759f-4eda-97da-15b57b2f62c5',
    'dd855161-7648-46c4-bd05-71f3713c5e5f',
    '5fabcee1-da55-4935-bc8b-fd799707cd8f',
    'f0a067bf-53a4-4bd6-bb0c-df4cd3d44cb6'
  ];
  for (const uid of targetUserIds) {
    const u = users.find(x => x.id === uid);
    console.log(`User ${uid}:`, u);
  }
}

findUsers().catch(console.error);

