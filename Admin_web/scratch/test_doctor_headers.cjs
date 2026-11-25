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

async function testHeadersAndParams() {
  const token = await getAdminToken();
  const targetUserId = 'b3891c3f-4232-4a5c-b3c3-0c2ac4f212e9'; // user without doctor profile

  const tests = [
    { name: 'Query param userId', path: `/api/v1/doctors?userId=${targetUserId}`, headers: {} },
    { name: 'Header x-user-id', path: '/api/v1/doctors', headers: { 'x-user-id': targetUserId } },
    { name: 'Header x-target-user-id', path: '/api/v1/doctors', headers: { 'x-target-user-id': targetUserId } },
    { name: 'Header user-id', path: '/api/v1/doctors', headers: { 'user-id': targetUserId } }
  ];

  const doctorDto = {
    fullName: `Dr. Header Test ${Date.now()}`,
    primarySpecialization: 'Cardiology',
    medicalCouncil: 'State Medical Board',
    registrationNumber: `REG-${Date.now().toString().slice(-6)}`,
    licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
    gender: 'FEMALE',
    dateOfBirth: '1985-05-18T00:00:00.000Z',
    yearsOfExperience: 10,
    department: 'Cardiology'
  };

  for (const t of tests) {
    const res = await request({
      hostname: '360api.vnvision.in',
      path: t.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...t.headers
      }
    }, doctorDto);

    console.log(`${t.name}: status ${res.status} (${res.body?.message || ''})`);
  }
}

testHeadersAndParams().catch(console.error);

