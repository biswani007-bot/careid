const fs = require('fs');

async function testIdentifiers() {
  const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).token;

  console.log('1. By userId 42fb3cb8-0afa-4f1f-8af5-1ab1b50910a0...');
  const res1 = await fetch('https://360api.vnvision.in/api/v1/admin/patients/42fb3cb8-0afa-4f1f-8af5-1ab1b50910a0', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status by userId:', res1.status);
  const data1 = await res1.json();
  console.log('Data by userId:', data1.success, data1.data?.id);

  console.log('\n2. By patientNumber PAT-023612...');
  const res2 = await fetch('https://360api.vnvision.in/api/v1/admin/patients/PAT-023612', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status by patientNumber:', res2.status);
  const data2 = await res2.json();
  console.log('Data by patientNumber:', data2.success, data2.data?.id);
}

testIdentifiers().catch(console.error);

