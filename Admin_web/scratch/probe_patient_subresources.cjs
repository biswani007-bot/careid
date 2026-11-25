const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '9a4ad630-de90-40e9-b4cd-1d76f8f63069';
const USER_ID = '7904ad9d-b141-471d-9451-4aa48ad3eba7';

async function probeSubresources() {
  console.log('=== PROBING SUBRESOURCES FOR FAILING PATIENT ===\n');

  const tests = [
    { name: 'Admin Medical Records Timeline', url: `${BASE_URL}/admin/patients/${PATIENT_ID}/medical-records/timeline` },
    { name: 'Admin Medical Records for Patient', url: `${BASE_URL}/admin/patients/${PATIENT_ID}/medical-records` },
    { name: 'Admin Medical Records Query Param', url: `${BASE_URL}/admin/medical-records?patientProfileId=${PATIENT_ID}` },
    { name: 'Security Consents', url: `${BASE_URL}/security/consents?patientId=${PATIENT_ID}` },
    { name: 'Security Consents with User ID', url: `${BASE_URL}/security/consents?patientId=${USER_ID}` },
    { name: 'Insurance Cards', url: `${BASE_URL}/patients/${PATIENT_ID}/insurance-cards` },
    { name: 'Appointments with patientProfileId', url: `${BASE_URL}/appointments?patientProfileId=${PATIENT_ID}` },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[${t.name}] -> HTTP ${res.status}`);
      const text = await res.text();
      console.log(`   Response: ${text.slice(0, 300)}\n`);
    } catch (err) {
      console.log(`[${t.name}] -> ERROR: ${err.message}\n`);
    }
  }
}

probeSubresources().catch(console.error);

