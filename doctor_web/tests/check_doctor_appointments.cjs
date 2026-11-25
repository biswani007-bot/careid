const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');

async function checkAppointments() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  const res = await fetch(`${BASE_URL}/appointments/doctor/me`, {
    headers: { Authorization: `Bearer ${cached.accessToken}` }
  });
  const data = await res.json();
  console.log('Appointments Status:', res.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}

checkAppointments();

