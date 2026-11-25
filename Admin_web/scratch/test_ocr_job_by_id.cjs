const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function testGetJobById() {
  const token = await getAdminToken();
  const id = '7676d984-a3b0-4271-a0fc-672566b54fc4';
  
  const opts = {
    hostname: '360api.vnvision.in',
    path: `/api/v1/ocr/jobs/${id}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };

  const res = await new Promise(resolve => {
    https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, data: JSON.parse(d) }));
    });
  });

  console.log(`Status: ${res.status}`);
  console.log('Body:', JSON.stringify(res.data, null, 2));
}

testGetJobById();

