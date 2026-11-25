const fs = require('fs');

async function testUserUpdate() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const userId = '42fb3cb8-0afa-4f1f-8af5-1ab1b50910a0';

  console.log(`Testing PUT /api/v1/admin/users/${userId}...`);
  const res = await fetch(`https://360api.vnvision.in/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fullName: 'Jane Updated Patient',
      email: 'jane.updated@careid.test',
      status: 'ACTIVE'
    })
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testUserUpdate().catch(console.error);

