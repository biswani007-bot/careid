const fs = require('fs');

async function checkSavedPatient() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  const phone = `+1650555${Math.floor(1000 + Math.random() * 9000)}`;
  const email = `sarah.connor.${Date.now()}@careid.test`;

  const payload = {
    phone,
    email,
    password: 'TempPassword123!',
    role: 'PATIENT',
    status: 'ACTIVE',
    fullName: 'Sarah Connor',
    firstName: 'Sarah',
    lastName: 'Connor',
    gender: 'FEMALE',
    dateOfBirth: '1985-05-20'
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
  console.log('User created:', data);

  const profileId = data.data?.patientProfileId;
  if (profileId) {
    const resProf = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profData = await resProf.json();
    console.log('Patient Profile:', JSON.stringify(profData, null, 2));
  }
}

checkSavedPatient().catch(console.error);

