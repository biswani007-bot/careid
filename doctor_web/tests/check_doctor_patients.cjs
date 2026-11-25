const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');

async function getValidToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  return cached.accessToken;
}

async function checkDoctorPatients() {
  const token = await getValidToken();
  const res = await fetch(`${BASE_URL}/doctors/patients?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Doctor Patients:', JSON.stringify(data, null, 2));

  const patients = data.data?.items || data.data || [];
  for (const p of patients) {
    const pId = p.id || p.patientProfileId;
    console.log(`\nChecking patient: ${pId} (${p.firstName} ${p.lastName})`);
    
    // Test medical records
    const recRes = await fetch(`${BASE_URL}/doctors/patients/${pId}/medical-records?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`  medical-records status: ${recRes.status}`);
    const recText = await recRes.text();
    console.log(`  medical-records sample: ${recText.slice(0, 150)}`);

    // Test timeline
    const timeRes = await fetch(`${BASE_URL}/doctors/patients/${pId}/medical-records/timeline?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`  timeline status: ${timeRes.status}`);
    const timeText = await timeRes.text();
    console.log(`  timeline sample: ${timeText.slice(0, 150)}`);
  }
}

checkDoctorPatients();

