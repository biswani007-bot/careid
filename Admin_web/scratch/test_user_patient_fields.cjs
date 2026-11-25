const fs = require('fs');

async function testAllowedUserFields() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  const phone = `+1650555${Math.floor(1000 + Math.random() * 9000)}`;
  const email = `patient.allowed.${Date.now()}@careid.test`;

  console.log('Testing POST /api/v1/admin/users with standard user fields...');
  const payload = {
    phone,
    email,
    password: 'TempPassword123!',
    role: 'PATIENT',
    status: 'ACTIVE',
    fullName: 'David Livingstone'
  };

  const res = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.data?.patientProfileId) {
    const profileId = data.data.patientProfileId;
    console.log(`\nChecking GET /api/v1/admin/patients/${profileId}...`);
    const resProfile = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profileData = await resProfile.json();
    console.log('Profile Data:', JSON.stringify(profileData, null, 2));
  }
}

testAllowedUserFields().catch(console.error);
