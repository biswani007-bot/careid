const fs = require('fs');

async function testMedicalRecords() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;
  const patientId = 'c870f212-4e09-461e-a5d3-89964c463f7a';

  console.log(`Testing GET /api/v1/admin/patients/${patientId}/medical-records...`);
  const res = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${patientId}/medical-records`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testMedicalRecords().catch(console.error);

