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

async function testAdminDoctors() {
  const token = await getAdminToken();

  console.log('--- Probing POST /api/v1/admin/doctors with empty body ---');
  let res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {});
  console.log('Status:', res.status);
  console.log('Body:', res.body);

  console.log('--- Probing POST /api/v1/admin/doctors with Postman sample body ---');
  res = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    userId: "b3891c3f-4232-4a5c-b3c3-0c2ac4f212e9",
    fullName: "Dr. Sarah Jenkins, MD",
    primarySpecialization: "Cardiology",
    medicalCouncil: "Pakistan Medical & Dental Council (PMDC)",
    registrationNumber: "PMC-REG-998877",
    licenseNumber: "LIC-2026-CARDIO-1",
    gender: "FEMALE",
    dateOfBirth: "1985-06-20",
    yearsOfExperience: 12,
    department: "Department of Cardiology"
  });
  console.log('Status:', res.status);
  console.log('Body:', res.body);
}

testAdminDoctors().catch(console.error);

