const fs = require('fs');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const tokenData = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenData.accessToken;

async function check() {
  console.log('--- Checking Doctor Endpoints for Patient', PATIENT_ID, '---');
  
  const endpoints = [
    '/doctors/patients/' + PATIENT_ID + '/medical-records',
    '/doctors/patients/' + PATIENT_ID + '/medical-records/timeline',
    '/doctors/patients/' + PATIENT_ID + '/vitals',
    '/doctors/patients/' + PATIENT_ID,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(BASE_URL + ep, {
        headers: { Authorization: `Bearer ${doctorToken}` }
      });
      const text = await res.text();
      console.log(`[${res.status}] ${ep} => ${text.slice(0, 300)}`);
    } catch (e) {
      console.log(`ERR ${ep}:`, e.message);
    }
  }
}

check();

