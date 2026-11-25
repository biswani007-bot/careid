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

async function testAssignArthur() {
  const token = await getAdminToken();
  const facilityId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  const doctorId = '7b03c487-4c01-4219-90ab-23c14abebfe7';

  console.log(`Assigning Arthur (${doctorId}) to facility ${facilityId}...`);
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
    privileges: ['OPD_CONSULTATION']
  });

  console.log('Assign status:', res.status, 'body id:', res.body?.id);

  const check = await request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/facilities/${facilityId}/doctors`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  const docs = check.body.data || check.body;
  const found = docs.find(d => d.id === doctorId || d.fullName.includes('Arthur'));
  console.log('Found in facility doctors list?', found ? 'YES' : 'NO');
}

testAssignArthur().catch(console.error);

