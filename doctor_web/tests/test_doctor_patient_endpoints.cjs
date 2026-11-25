const fs = require('fs');
const tokenData = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenData.accessToken;
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const BASE = 'https://360api.vnvision.in/api/v1';

async function testAll() {
  const attempts = [
    { url: `${BASE}/patients/${PATIENT_ID}/medical-records`, headers: {} },
    { url: `${BASE}/patients/${PATIENT_ID}/records`, headers: {} },
    { url: `${BASE}/patients/${PATIENT_ID}/vitals`, headers: {} },
    { url: `${BASE}/patients/${PATIENT_ID}/timeline`, headers: {} },
    { url: `${BASE}/patients/${PATIENT_ID}`, headers: {} },
    { url: `${BASE}/medical-records`, headers: { 'x-patient-id': PATIENT_ID } },
    { url: `${BASE}/medical-records`, headers: { 'x-patient-profile-id': PATIENT_ID } },
    { url: `${BASE}/records`, headers: { 'x-patient-id': PATIENT_ID } },
    { url: `${BASE}/reports?patientId=${PATIENT_ID}`, headers: {} },
    { url: `${BASE}/reports?patientProfileId=${PATIENT_ID}`, headers: {} },
    { url: `${BASE}/reports`, headers: {} },
    { url: `${BASE}/immunisation/records?patientId=${PATIENT_ID}`, headers: {} },
  ];

  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        headers: {
          Authorization: `Bearer ${doctorToken}`,
          ...a.headers
        }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${a.url} => ${text.slice(0, 120)}`);
    } catch (e) {
      console.log(`ERR: ${a.url}: ${e.message}`);
    }
  }
}

testAll();

