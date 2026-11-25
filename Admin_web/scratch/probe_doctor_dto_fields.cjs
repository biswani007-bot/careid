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

async function probeDoctorDtoFields() {
  const token = await getAdminToken();

  // Test fields
  const candidateFields = [
    'user',
    'account',
    'accountId',
    'phone',
    'email',
    'password',
    'temporaryPassword',
    'status',
    'facilityId',
    'hospitalId',
    'hospital',
    'role',
    'roles'
  ];

  for (const field of candidateFields) {
    const body = {
      fullName: 'Dr. Test Field Probe',
      primarySpecialization: 'Cardiology',
      medicalCouncil: 'State Medical Board',
      registrationNumber: 'REG-123',
      licenseNumber: 'LIC-123',
      gender: 'MALE',
      dateOfBirth: '1980-01-01',
      yearsOfExperience: 5,
      department: 'Cardiology',
      [field]: 'test_val'
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

    const isFieldRejected = JSON.stringify(res.body).includes(`property ${field} should not exist`);
    console.log(`Field '${field}': ${isFieldRejected ? 'FORBIDDEN (whitelist rejected)' : 'ACCEPTED OR OTHER ERROR: ' + res.status + ' ' + JSON.stringify(res.body?.message)}`);
  }
}

probeDoctorDtoFields().catch(console.error);

