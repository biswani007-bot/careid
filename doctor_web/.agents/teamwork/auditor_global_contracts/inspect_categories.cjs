const fs = require('fs');
const path = require('path');

const endpoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), 'utf8'));

// 1. Treatment Offers
const treatmentOffers = endpoints.filter(e => e.url.includes('/treatment-offers') || e.url.includes('treatment_offer') || e.url.includes('treatment-offer'));

// 2. Appointments
const appointments = endpoints.filter(e => e.url.includes('/appointments') || e.name.toLowerCase().includes('appointment'));

// 3. Facilities
const facilities = endpoints.filter(e => e.url.includes('/facilities') || e.name.toLowerCase().includes('facility'));

// 4. Pre-op / Clearance / Hold / Readiness / Check-in
const preOpEtc = endpoints.filter(e => {
  const text = `${e.url} ${e.name} ${e.folder}`.toLowerCase();
  return text.includes('clearance') || text.includes('pre-op') || text.includes('preop') ||
         text.includes('hold') || text.includes('readiness') || text.includes('check-in') ||
         text.includes('checkin') || text.includes('cath-lab') || text.includes('cathlab');
});

// 5. Doctor Profile & Me
const doctorProfile = endpoints.filter(e => e.url.includes('/doctors/me') || e.url.includes('/doctor/me') || (e.url.includes('/doctors') && e.name.toLowerCase().includes('profile')));

console.log('=== TREATMENT OFFERS ENDPOINTS ===', treatmentOffers.length);
treatmentOffers.forEach(e => console.log(`[${e.method}] ${e.url} | ${e.name} | Folder: ${e.folder}`));

console.log('\n=== APPOINTMENTS ENDPOINTS (sample) ===', appointments.length);
appointments.slice(0, 15).forEach(e => console.log(`[${e.method}] ${e.url} | ${e.name} | Folder: ${e.folder}`));

console.log('\n=== FACILITIES ENDPOINTS (sample) ===', facilities.length);
facilities.slice(0, 10).forEach(e => console.log(`[${e.method}] ${e.url} | ${e.name} | Folder: ${e.folder}`));

console.log('\n=== PRE-OP / CLEARANCE / HOLD / READINESS / CHECK-IN / CATH-LAB ===', preOpEtc.length);
preOpEtc.forEach(e => console.log(`[${e.method}] ${e.url} | ${e.name} | Folder: ${e.folder}`));

console.log('\n=== DOCTOR PROFILE / ME ===', doctorProfile.length);
doctorProfile.forEach(e => console.log(`[${e.method}] ${e.url} | ${e.name} | Folder: ${e.folder}`));

