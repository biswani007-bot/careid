const fs = require('fs');

async function testDuplicateUser() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  console.log('Testing duplicate user creation...');
  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: '+16505550088',
      email: 'duplicate@careid.test',
      password: 'TempPassword123!',
      role: 'PATIENT',
      status: 'ACTIVE',
      fullName: 'Duplicate Patient'
    })
  });
  console.log('Status for duplicate:', res.status);
  const data = await res.json();
  console.log('Response for duplicate:', JSON.stringify(data, null, 2));
}

testDuplicateUser().catch(console.error);

