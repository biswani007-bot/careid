const fs = require('fs');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenData.accessToken || tokenData.token;

async function checkPatients() {
  const res = await fetch('https://360api.vnvision.in/api/v1/admin/patients?limit=100', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('Patients response status:', res.status);
  const patients = (data.data && data.data.data) || data.data || [];
  console.log('Patients count:', patients.length);
  patients.forEach((p, idx) => {
    console.log(
      '[' + (idx + 1) + '] ID: ' + p.id +
      ' | UserID: ' + (p.userId || 'none') +
      ' | Name: ' + p.firstName + ' ' + p.lastName +
      ' | Number: ' + p.patientNumber +
      ' | Status: ' + p.status +
      ' | ProfileStatus: ' + p.profileStatus +
      ' | VerificationStatus: ' + (p.verificationStatus || p.kycStatus || 'none') +
      ' | isVerified: ' + p.isVerified
    );
  });
  console.log('\n--- Full JSON of first 2 patients ---');
  console.log(JSON.stringify(patients.slice(0, 2), null, 2));
}

checkPatients().catch(console.error);

