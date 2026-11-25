const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    r.end();
  });
}

async function testAssignDoctor() {
  const token = await getAdminToken();
  const facilityId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  const doctorId = 'df2f1bfb-28bd-4d05-8b55-fa58b7350983';

  console.log(`Assigning doctor ${doctorId} to facility ${facilityId}...`);
  const res = await request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/facilities/${facilityId}/assign-doctor`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    doctorId,
    assignmentType: 'PRIMARY',
    privileges: ['OPD_CONSULTATION', 'INPATIENT_ADMISSION']
  });

  console.log('Assign status:', res.status);
  console.log('Assign body:', res.body);

  // Now verify via GET /api/v1/facilities/:id/doctors
  console.log(`Querying GET /api/v1/facilities/${facilityId}/doctors...`);
  const listRes = await request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/facilities/${facilityId}/doctors`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('Facility doctors status:', listRes.status);
  const docs = listRes.body.data || listRes.body;
  console.log('Facility doctors count:', docs.length);
  const found = (Array.isArray(docs) ? docs : []).find(d => (d.doctorId === doctorId || d.id === doctorId || d.doctor?.id === doctorId));
  console.log('Found assigned doctor in facility?', found ? 'YES' : 'NO', found);
}

testAssignDoctor().catch(console.error);

