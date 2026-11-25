const fs = require('fs');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const tokenData = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenData.accessToken;

async function check() {
  const eps = [
    // Direct medical records with query params as doctor
    `/medical-records?patientProfileId=${PATIENT_ID}`,
    `/medical-records?patientId=${PATIENT_ID}`,
    `/medical-records`,
    `/records?patientProfileId=${PATIENT_ID}`,
    `/records?patientId=${PATIENT_ID}`,
    `/records`,
    // Search endpoint
    `/medical-records/search?q=Annual`,
    `/records/search?q=Annual`,
    // Admin endpoints (if doctor has read access or permissions)
    `/admin/patients/${PATIENT_ID}/medical-records`,
    `/admin/medical-records?patientProfileId=${PATIENT_ID}`,
  ];

  for (const ep of eps) {
    try {
      const res = await fetch(BASE_URL + ep, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${ep} => ${text.slice(0, 150)}`);
    } catch (e) {
      console.log(`ERR ${ep}:`, e.message);
    }
  }
}

check();

