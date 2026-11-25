const fs = require('fs');

async function testCreation() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  console.log('Testing GET /api/v1/admin/patients/331d4137-ab34-4e5f-9530-848b8987ba98...');
  const resDetail = await fetch('https://360api.vnvision.in/api/v1/admin/patients/331d4137-ab34-4e5f-9530-848b8987ba98', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Detail status by UUID:', resDetail.status);
  const detailData = await resDetail.json();
  console.log('Detail data:', JSON.stringify(detailData, null, 2));

  console.log('\nTesting GET /api/v1/admin/patients/PT-1794477776571...');
  const resDetail2 = await fetch('https://360api.vnvision.in/api/v1/admin/patients/PT-1794477776571', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Detail status by patientNumber:', resDetail2.status);
  const detailData2 = await resDetail2.json();
  console.log('Detail by patientNumber:', JSON.stringify(detailData2, null, 2));

  // Let's test POST /api/v1/admin/users with role PATIENT:
  console.log('\nTesting POST /api/v1/admin/users with role: PATIENT...');
  const testUserPayload = {
    phone: '+16505550088',
    email: 'new.patient.test@careid.test',
    password: 'TempPassword123!',
    role: 'PATIENT',
    status: 'ACTIVE',
    fullName: 'Jane Test Patient'
  };
  const resUser = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testUserPayload)
  });
  console.log('POST /api/v1/admin/users status:', resUser.status);
  const userResData = await resUser.json();
  console.log('POST /api/v1/admin/users response:', JSON.stringify(userResData, null, 2));
}

testCreation().catch(console.error);

