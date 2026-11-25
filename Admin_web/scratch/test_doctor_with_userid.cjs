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

async function testDoctorWithUserId() {
  const token = await getAdminToken();

  // Pick a user without doctorProfileId: e.g. from /api/v1/admin/users
  // Let's get user b3891c3f-4232-4a5c-b3c3-0c2ac4f212e9 or another one
  const targetUserId = 'b3891c3f-4232-4a5c-b3c3-0c2ac4f212e9';

  console.log(`Testing POST /api/v1/doctors with userId=${targetUserId}...`);
  const res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    userId: targetUserId,
    fullName: 'Dr. Test Registration Flow',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Pakistan Medical & Dental Council (PMDC)',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'MALE',
    dateOfBirth: '1980-05-15',
    yearsOfExperience: 10,
    department: 'Department of Cardiology'
  });

  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

testDoctorWithUserId().catch(console.error);

