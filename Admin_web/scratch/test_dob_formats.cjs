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

async function testDob(dobVal) {
  const token = await getAdminToken();
  const body = {
    fullName: 'Dr. Test DOB',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: 'REG-DOB',
    licenseNumber: 'LIC-DOB',
    gender: 'MALE',
    dateOfBirth: dobVal,
    yearsOfExperience: 5,
    department: 'Cardiology'
  };

  const res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, body);

  console.log(`Testing DOB '${dobVal}' -> status ${res.status}:`, JSON.stringify(res.body?.message || res.body?.error || res.body));
}

async function run() {
  await testDob('1985-05-18T00:00:00.000Z');
  await testDob('1985-05-18');
  await testDob('05/18/1985');
}

run().catch(console.error);

