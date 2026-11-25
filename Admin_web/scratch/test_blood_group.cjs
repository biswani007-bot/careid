const fs = require('fs');

async function testBloodGroup() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  const phone = `+1650555${Math.floor(1000 + Math.random() * 9000)}`;
  const email = `blood.test.${Date.now()}@careid.test`;

  const payload = {
    phone,
    email,
    password: 'TempPassword123!',
    role: 'PATIENT',
    status: 'ACTIVE',
    fullName: 'Blood Test',
    firstName: 'Blood',
    lastName: 'Test',
    gender: 'MALE',
    dateOfBirth: '1990-01-01',
    bloodGroup: 'O+'
  };

  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Result for bloodGroup:', data.message || data.success);
}

testBloodGroup().catch(console.error);

