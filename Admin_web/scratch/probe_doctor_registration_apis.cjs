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

async function probe() {
  const token = await getAdminToken();
  console.log('Got token.');

  // 1. Test POST /api/v1/admin/users
  console.log('\n--- 1. Testing POST /api/v1/admin/users ---');
  const resAdminUsers = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    phone: '+16505559999',
    email: 'test.doc@careid.test',
    password: 'TempPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: 'Dr. Test Prober'
  });
  console.log('Status:', resAdminUsers.status);
  console.log('Body:', resAdminUsers.body);

  // 2. Test POST /api/v1/doctors
  console.log('\n--- 2. Testing POST /api/v1/doctors ---');
  const resDoctors = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    fullName: 'Dr. Test Doctor Post',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Pakistan Medical & Dental Council (PMDC)',
    registrationNumber: `TEST-REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'MALE',
    dateOfBirth: '1980-05-15',
    yearsOfExperience: 10,
    department: 'Department of Cardiology'
  });
  console.log('Status:', resDoctors.status);
  console.log('Body:', resDoctors.body);

  // 3. Test POST /api/v1/admin/doctors
  console.log('\n--- 3. Testing POST /api/v1/admin/doctors ---');
  const resAdminDoctors = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/doctors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    fullName: 'Dr. Test Admin Doctor',
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'Pakistan Medical & Dental Council (PMDC)',
    registrationNumber: `ADM-REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `ADM-LIC-${Date.now().toString().slice(-6)}`,
    gender: 'MALE',
    dateOfBirth: '1980-05-15',
    yearsOfExperience: 10,
    department: 'Department of Cardiology'
  });
  console.log('Status:', resAdminDoctors.status);
  console.log('Body:', resAdminDoctors.body);

  // 4. Test auth registration or user creation endpoints
  console.log('\n--- 4. Checking what other user creation endpoints exist ---');
  // Check POST /api/v1/auth/register
  const resAuthReg = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {});
  console.log('POST /api/v1/auth/register ->', resAuthReg.status, resAuthReg.body?.message || resAuthReg.body);
}

probe().catch(console.error);

