const https = require('https');
const fs = require('fs');

const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

function apiRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${tokenData.token}`
      }
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const failingId = '9a4ad630-de90-40e9-b4cd-1d76f8f63069';
  console.log(`\n1. Probing GET /api/v1/admin/patients/${failingId} ...`);
  const detailRes = await apiRequest(`/api/v1/admin/patients/${failingId}`);
  console.log('Status:', detailRes.status);
  console.log('Body:\n', JSON.stringify(detailRes.body, null, 2));

  console.log(`\n2. Probing GET /api/v1/admin/patients (page 1, limit 50) ...`);
  const listRes = await apiRequest('/api/v1/admin/patients?limit=50');
  console.log('List Status:', listRes.status);
  const listData = listRes.body?.data || listRes.body;
  if (Array.isArray(listData)) {
    console.log(`Total patients in list: ${listData.length}`);
    const match = listData.find(p => p.id === failingId || p.userId === failingId || p.patientProfileId === failingId);
    console.log('Match for failingId in admin/patients:', match);
    console.log('\nSample patient keys:', Object.keys(listData[0] || {}));
    console.log('First 3 patients:');
    listData.slice(0, 3).forEach(p => console.log({
      id: p.id,
      userId: p.userId,
      patientProfileId: p.patientProfileId,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.fullName,
      phone: p.phone,
      patientNumber: p.patientNumber
    }));
  } else {
    console.log('List body:', listData);
  }

  console.log(`\n3. Probing GET /api/v1/admin/users ...`);
  const usersRes = await apiRequest('/api/v1/admin/users?limit=50');
  console.log('Users Status:', usersRes.status);
  const usersData = usersRes.body?.data || usersRes.body;
  if (Array.isArray(usersData)) {
    console.log(`Total users: ${usersData.length}`);
    const userMatch = usersData.find(u => u.id === failingId || u.patientProfileId === failingId);
    console.log('Match for failingId in admin/users:', userMatch);
  }

  console.log(`\n4. Probing Doctor portal GET /api/v1/doctors/patients ...`);
  const docPatientsRes = await apiRequest('/api/v1/doctors/patients?limit=50');
  console.log('Doc Patients Status:', docPatientsRes.status);
  const docData = docPatientsRes.body?.data || docPatientsRes.body;
  if (Array.isArray(docData)) {
    console.log(`Total doctor patients: ${docData.length}`);
    const docMatch = docData.find(p => p.id === failingId || p.userId === failingId || p.patientProfileId === failingId);
    console.log('Match in doc patients:', docMatch);
  }
}

run().catch(console.error);

