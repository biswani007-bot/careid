const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const tokenCache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenCache.accessToken;

async function testEndpoints() {
  const eps = [
    `/doctors/patients/${PATIENT_ID}`,
    `/doctors/patients/${PATIENT_ID}/medical-records`,
    `/doctors/patients/${PATIENT_ID}/medical-records/timeline`,
    `/doctors/patients/${PATIENT_ID}/vitals`,
    `/doctors/patients/${PATIENT_ID}/prescriptions`,
    `/doctors/patients/${PATIENT_ID}/admissions`,
  ];

  for (const ep of eps) {
    try {
      const res = await fetch(BASE_URL + ep, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      const text = await res.text();
      console.log(`[${res.status}] ${ep} => ${text.slice(0, 160)}`);
    } catch (e) {
      console.log(`ERR ${ep}:`, e.message);
    }
  }
}

testEndpoints();

