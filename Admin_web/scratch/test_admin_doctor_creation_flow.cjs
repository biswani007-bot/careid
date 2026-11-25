const fs = require('fs');
const https = require('https');

const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      rejectUnauthorized: false
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch(e) { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('1. Creating DOCTOR user account in /api/v1/admin/users...');
  const phone = '+1650555' + Math.floor(1000 + Math.random() * 9000);
  const email = `dr.house.${Math.floor(1000 + Math.random() * 9000)}@careid.test`;

  const userRes = await post('/api/v1/admin/users', {
    phone,
    email,
    password: 'TempPassword123!',
    role: 'DOCTOR',
    status: 'ACTIVE',
    fullName: 'Dr. Gregory House, MD'
  });

  console.log('User created:', userRes.status, userRes.body?.data?.id || userRes.body);
  const userId = userRes.body?.data?.id;
  if (!userId) {
    console.error('Failed to create user account');
    return;
  }

  console.log('\n2. Calling POST /api/v1/admin/doctors with userId:', userId);
  const regNumber = 'MED-REG-' + Math.floor(100000 + Math.random() * 900000);
  const licNumber = 'LIC-MD-' + Math.floor(100000 + Math.random() * 900000);

  const docRes = await post('/api/v1/admin/doctors', {
    userId,
    fullName: 'Dr. Gregory House, MD',
    primarySpecialization: 'Diagnostic Medicine',
    medicalCouncil: 'State Medical Board',
    registrationNumber: regNumber,
    licenseNumber: licNumber,
    gender: 'MALE',
    dateOfBirth: '1975-06-11',
    yearsOfExperience: 20,
    department: 'Department of Diagnostics'
  });

  console.log('Doctor created:', docRes.status, docRes.body);
}

run();

