const fs = require('fs');
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const token = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')).accessToken;

async function testVariations() {
  const tests = [
    `/doctors/patients/${PATIENT_ID}/medical-records`,
    `/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=10`,
    `/doctors/patients/${PATIENT_ID}/medical-records?includeArchived=false`,
    `/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=5&includeArchived=false`,
    `/doctors/patients/${PATIENT_ID}/medical-records?status=ACTIVE`,
    `/doctors/patients/${PATIENT_ID}/medical-records/timeline`,
    `/doctors/patients/${PATIENT_ID}/medical-records/timeline?page=1&limit=10`,
  ];
  for (const t of tests) {
    const res = await fetch(BASE_URL + t, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.text();
    console.log(`[${res.status}] ${t} => ${body.slice(0, 140)}`);
  }
}
testVariations();

