const fs = require('fs');

async function audit() {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;

  const [usersRes, patientsRes] = await Promise.all([
    fetch('https://360api.vnvision.in/api/v1/admin/users', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
    fetch('https://360api.vnvision.in/api/v1/admin/patients?limit=100', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json())
  ]);

  console.log('=== ENDPOINT 1: GET /api/v1/admin/users ===');
  console.log('Total platform users returned:', usersRes.data.length);

  const patientUsers = usersRes.data.filter(u => u.roles && u.roles.includes('PATIENT'));
  console.log('Users having PATIENT role:', patientUsers.length);

  console.log('\n=== ENDPOINT 2: GET /api/v1/admin/patients ===');
  console.log('Total patient profiles returned:', (patientsRes.data || []).length);
  console.log('Registered patient profile records:');
  (patientsRes.data || []).forEach(p => {
    console.log(`- Profile ID: ${p.id} | userId: ${p.userId} | Name: ${p.firstName} ${p.lastName} | Phone: ${p.phone} | Status: ${p.profileStatus} | Patient#: ${p.patientNumber}`);
  });

  console.log('\n=== CORRELATION: 9 PATIENT ACCOUNTS vs PATIENT PROFILES ===');
  const pProfiles = patientsRes.data || [];
  patientUsers.forEach((u, i) => {
    const linkedProfile = pProfiles.find(p => p.userId === u.id || p.id === u.patientProfileId);
    console.log(`${i + 1}. User ID: ${u.id}`);
    console.log(`   Phone: ${u.phone}`);
    console.log(`   Account Status: ${u.status}`);
    console.log(`   patientProfileId on User entity: ${u.patientProfileId || 'null'}`);
    if (linkedProfile) {
      console.log(`   Linked PatientProfile: YES`);
      console.log(`   Profile ID: ${linkedProfile.id}`);
      console.log(`   Full Name: ${linkedProfile.firstName} ${linkedProfile.lastName}`);
      console.log(`   Profile Status: ${linkedProfile.profileStatus} (Completed)`);
      console.log(`   Patient Number: ${linkedProfile.patientNumber}`);
    } else {
      console.log(`   Linked PatientProfile: NO (Incomplete / Unonboarded Phone Account)`);
    }
    console.log('----------------------------------------------------');
  });
}

audit().catch(console.error);

