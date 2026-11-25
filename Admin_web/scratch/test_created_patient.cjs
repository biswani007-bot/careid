const fs = require('fs');

async function testCreatedPatient() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const profileId = 'c870f212-4e09-461e-a5d3-89964c463f7a';

  console.log(`1. Testing GET /api/v1/admin/patients/${profileId}...`);
  const res = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${profileId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Patient Profile Data:', JSON.stringify(data, null, 2));

  // Now let's see how demographic information (DOB, gender, address) can be updated or set
  console.log(`\n2. Testing PUT /api/v1/admin/patients/${profileId}...`);
  const updatePayload = {
    firstName: 'Jane',
    lastName: 'Patient',
    dateOfBirth: '1995-05-10',
    gender: 'FEMALE',
    bloodGroup: 'B+',
    address: '456 Main St, New York, NY',
    currentPostalCode: '10001'
  };
  const resPut = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${profileId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });
  console.log('PUT /api/v1/admin/patients/:id status:', resPut.status);
  const putData = await resPut.json();
  console.log('PUT response:', JSON.stringify(putData, null, 2));

  // Let's also check GET /api/v1/admin/patients to see if it now appears in directory:
  console.log('\n3. Checking GET /api/v1/admin/patients list...');
  const resList = await fetch('https://360api.vnvision.in/api/v1/admin/patients', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listData = await resList.json();
  console.log('Total patients in directory:', listData.data?.length);
  listData.data?.forEach(p => {
    console.log(`- ${p.id} | ${p.patientNumber} | ${p.firstName} ${p.lastName} | ${p.phone}`);
  });
}

testCreatedPatient().catch(console.error);

