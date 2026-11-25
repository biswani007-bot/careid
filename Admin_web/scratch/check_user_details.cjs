const https = require('https');
const fs = require('fs');

const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

function get(path) {
  return new Promise(resolve => {
    https.get('https://360api.vnvision.in' + path, {
      headers: { Authorization: `Bearer ${token}` }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ path, status: res.statusCode, json: JSON.parse(d) });
        } catch (e) {
          resolve({ path, status: res.statusCode, raw: d.substring(0, 300) });
        }
      });
    });
  });
}

async function run() {
  const u0 = await get('/api/v1/admin/users/74e82159-f90e-4695-9c61-a3feb2997a11');
  console.log('User 0:', JSON.stringify(u0.json, null, 2));

  const u1 = await get('/api/v1/admin/users/a19472f6-7076-45f3-a5b2-163b7c2d1b8d');
  console.log('User 1:', JSON.stringify(u1.json, null, 2));

  // Search doctors
  const docSearch1 = await get('/api/v1/doctors?search=swagat');
  console.log('Doc search swagat:', JSON.stringify(docSearch1.json, null, 2));

  const docSearch2 = await get('/api/v1/doctors?search=biswa');
  console.log('Doc search biswa:', JSON.stringify(docSearch2.json, null, 2));

  const docSearch3 = await get('/api/v1/doctors?phone=%2B91784697854');
  console.log('Doc search phone 1:', JSON.stringify(docSearch3.json, null, 2));
}

run();

