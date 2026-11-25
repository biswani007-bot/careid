const fs = require('fs');

async function testAdminUserFields() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  // Let's test with various fields to see what the validator allows:
  const fields = ['gender', 'dateOfBirth', 'firstName', 'lastName', 'dob', 'profilePhotoUrl'];
  
  for (const field of fields) {
    const payload = {
      phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
      email: `test.${field}.${Date.now()}@careid.test`,
      password: 'TempPassword123!',
      role: 'PATIENT',
      status: 'ACTIVE',
      fullName: 'Test Candidate',
      [field]: field === 'dateOfBirth' || field === 'dob' ? '1990-01-01' : (field === 'gender' ? 'FEMALE' : 'value')
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
    console.log(`Field "${field}": HTTP ${res.status}`, data.message || data.success);
  }
}

testAdminUserFields().catch(console.error);

