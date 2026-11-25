const fs = require('fs');

async function testBackendPatients() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  console.log('1. Testing GET /api/v1/admin/patients...');
  const res1 = await fetch('https://360api.vnvision.in/api/v1/admin/patients?limit=10', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /api/v1/admin/patients status:', res1.status);
  const data1 = await res1.json();
  console.log('GET patients response:', JSON.stringify(data1, null, 2));

  console.log('\n2. Testing POST /api/v1/admin/patients...');
  const testPayload = {
    firstName: 'Test',
    lastName: 'Patient',
    phone: '+16505550888',
    email: 'test.patient@careid.test',
    gender: 'MALE',
    dateOfBirth: '1995-05-10',
    address: '123 Test Street, Springfield',
    currentPostalCode: '12345'
  };
  const res2 = await fetch('https://360api.vnvision.in/api/v1/admin/patients', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testPayload)
  });
  console.log('POST /api/v1/admin/patients status:', res2.status);
  const data2 = await res2.json();
  console.log('POST /api/v1/admin/patients response:', JSON.stringify(data2, null, 2));
}

testBackendPatients().catch(console.error);

