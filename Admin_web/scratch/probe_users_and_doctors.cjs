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
  console.log('--- Inspecting live users & doctors ---');
  const usersRes = await get('/api/v1/admin/users?limit=50');
  console.log('GET /api/v1/admin/users status:', usersRes.status);
  fs.writeFileSync('scratch/live_users_response.json', JSON.stringify(usersRes, null, 2));

  const doctorsRes = await get('/api/v1/doctors?limit=50');
  console.log('GET /api/v1/doctors status:', doctorsRes.status);
  fs.writeFileSync('scratch/live_doctors_response.json', JSON.stringify(doctorsRes, null, 2));

  const adminDoctorsRes = await get('/api/v1/admin/doctors?limit=50');
  console.log('GET /api/v1/admin/doctors status:', adminDoctorsRes.status);
  fs.writeFileSync('scratch/live_admin_doctors_response.json', JSON.stringify(adminDoctorsRes, null, 2));
}

run();

