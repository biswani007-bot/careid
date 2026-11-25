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

async function probeStaff() {
  const token = await getAdminToken();

  // Test POST /api/v1/staff with DOCTOR staffType
  const res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/staff',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    fullName: 'Dr. Test Staff Doctor',
    phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
    staffType: 'DOCTOR',
    designation: 'Attending Physician',
    primaryFacilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
    gender: 'MALE',
    dateOfBirth: '1985-05-15',
    email: 'test.staff.doctor@careid.test'
  });

  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

probeStaff().catch(console.error);

