const https = require('https');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
let token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;

function req(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    r.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

async function main() {
  console.log('--- Probing Live Facility API Endpoints ---');

  // 1. GET /api/v1/facilities
  const listRes = await req('/api/v1/facilities');
  console.log('\n1. GET /api/v1/facilities: Status', listRes.status);
  console.log('List data sample:', JSON.stringify(listRes.data, null, 2).slice(0, 800));

  // 2. GET /api/v1/facilities/statistics
  const statsRes = await req('/api/v1/facilities/statistics');
  console.log('\n2. GET /api/v1/facilities/statistics: Status', statsRes.status);
  console.log('Stats data:', JSON.stringify(statsRes.data, null, 2));

  // 3. GET /api/v1/facilities/search?q=metro
  const searchRes = await req('/api/v1/facilities/search?q=metro');
  console.log('\n3. GET /api/v1/facilities/search?q=metro: Status', searchRes.status);
  console.log('Search data:', JSON.stringify(searchRes.data, null, 2));

  // If we have any facilities from list:
  const facilities = Array.isArray(listRes.data?.data) ? listRes.data.data : (Array.isArray(listRes.data) ? listRes.data : []);
  console.log(`Found ${facilities.length} live facilities.`);
  if (facilities.length > 0) {
    const facId = facilities[0].id;
    console.log(`Testing with facility ID: ${facId} (${facilities[0].name || facilities[0].facilityName})`);

    // Details
    const detailRes = await req(`/api/v1/facilities/${facId}`);
    console.log(`\n4. GET /api/v1/facilities/${facId}: Status`, detailRes.status);
    console.log('Detail data:', JSON.stringify(detailRes.data, null, 2).slice(0, 600));

    // Doctors
    const docRes = await req(`/api/v1/facilities/${facId}/doctors`);
    console.log(`\n5. GET /api/v1/facilities/${facId}/doctors: Status`, docRes.status);
    console.log('Doctors data:', JSON.stringify(docRes.data, null, 2).slice(0, 600));

    // Departments
    const deptRes = await req(`/api/v1/facilities/${facId}/departments`);
    console.log(`\n6. GET /api/v1/facilities/${facId}/departments: Status`, deptRes.status);
    console.log('Departments data:', JSON.stringify(deptRes.data, null, 2).slice(0, 600));

    // Rooms
    const roomRes = await req(`/api/v1/facilities/${facId}/rooms`);
    console.log(`\n7. GET /api/v1/facilities/${facId}/rooms: Status`, roomRes.status);
    console.log('Rooms data:', JSON.stringify(roomRes.data, null, 2).slice(0, 600));

    // History
    const historyRes = await req(`/api/v1/facilities/${facId}/history`);
    console.log(`\n8. GET /api/v1/facilities/${facId}/history: Status`, historyRes.status);
    console.log('History data:', JSON.stringify(historyRes.data, null, 2).slice(0, 600));
  }
}

main().catch(console.error);

