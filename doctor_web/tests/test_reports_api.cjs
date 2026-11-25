const fs = require('fs');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const tokenCache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenCache.accessToken;

async function testDoctorReports() {
  console.log('--- Testing /api/v1/reports with Doctor Token ---');
  const variations = [
    '/reports',
    `/reports?patientProfileId=${PATIENT_ID}`,
    `/reports?patientId=${PATIENT_ID}`,
    `/reports?category=LAB`,
    `/reports?category=RADIOLOGY`,
    `/reports?category=CLINICAL`,
    `/reports?patientProfileId=${PATIENT_ID}&category=LAB`,
    `/reports/categories`,
    `/reports/timeline`,
    `/reports/search?q=Blood`,
  ];

  for (const v of variations) {
    try {
      const res = await fetch(BASE_URL + v, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${v} => ${text.slice(0, 160)}`);
    } catch (e) {
      console.log(`ERR ${v}:`, e.message);
    }
  }
}

testDoctorReports();

