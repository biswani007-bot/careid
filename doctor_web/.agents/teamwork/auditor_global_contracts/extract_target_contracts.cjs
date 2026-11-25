const fs = require('fs');
const path = require('path');

const endpoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), 'utf8'));

// Targets:
// 1. POST /api/v1/doctors/treatment-offers
// 2. GET /api/v1/doctors/treatment-offers
// 3. GET /api/v1/doctors/treatment-offers/:offerId
// 4. PUT /api/v1/doctors/treatment-offers/:offerId
// 5. POST /api/v1/doctors/treatment-offers/:offerId/dispatch
// 6. GET /api/v1/doctors/treatment-offers/:offerId/status
// 7. POST /api/v1/doctors/treatment-offers/:offerId/cancel
// 8. POST /api/v1/patients/treatment-offers/:offerId/accept
// 9. POST /api/v1/patients/treatment-offers/:offerId/reject
// 10. POST /api/v1/appointments
// 11. GET /api/v1/appointments
// 12. GET /api/v1/appointments/doctor/me
// 13. GET /api/v1/appointments/:id
// 14. PUT /api/v1/appointments/:id/status
// 15. GET /api/v1/facilities
// 16. GET /api/v1/facilities/:id
// 17. GET /api/v1/facilities/:id/rooms
// 18. GET /api/v1/doctors/me
// 19. GET /api/v1/doctors/:id/slots
// 20. GET /api/v1/financing/options

const targetPatterns = [
  { key: 'create_offer', pattern: 'POST /api/v1/doctors/treatment-offers' },
  { key: 'list_offers', pattern: 'GET /api/v1/doctors/treatment-offers' },
  { key: 'get_offer', pattern: 'GET /api/v1/doctors/treatment-offers/:offerId' },
  { key: 'update_offer', pattern: 'PUT /api/v1/doctors/treatment-offers/:offerId' },
  { key: 'dispatch_offer', pattern: 'POST /api/v1/doctors/treatment-offers/:offerId/dispatch' },
  { key: 'status_offer', pattern: 'GET /api/v1/doctors/treatment-offers/:offerId/status' },
  { key: 'cancel_offer', pattern: 'POST /api/v1/doctors/treatment-offers/:offerId/cancel' },
  { key: 'patient_accept_offer', pattern: 'POST /api/v1/patients/treatment-offers/:offerId/accept' },
  { key: 'patient_reject_offer', pattern: 'POST /api/v1/patients/treatment-offers/:offerId/reject' },
  { key: 'create_appointment', pattern: 'POST /api/v1/appointments' },
  { key: 'list_appointments', pattern: 'GET /api/v1/appointments' },
  { key: 'doctor_appointments', pattern: 'GET /api/v1/appointments/doctor/me' },
  { key: 'get_appointment', pattern: 'GET /api/v1/appointments/:id' },
  { key: 'update_appointment_status', pattern: 'PUT /api/v1/appointments/:id/status' },
  { key: 'list_facilities', pattern: 'GET /api/v1/facilities' },
  { key: 'get_facility', pattern: 'GET /api/v1/facilities/:id' },
  { key: 'list_facility_rooms', pattern: 'GET /api/v1/facilities/:id/rooms' },
  { key: 'doctor_me', pattern: 'GET /api/v1/doctors/me' },
  { key: 'doctor_slots', pattern: 'GET /api/v1/doctors/:id/slots' },
  { key: 'financing_options', pattern: 'GET /api/v1/financing/options' }
];

const extracted = [];

for (const target of targetPatterns) {
  const [method, urlPath] = target.pattern.split(' ');
  const match = endpoints.find(e => {
    if (e.method !== method) return false;
    const cleanUrl = e.url.replace('{{baseUrl}}', '').split('?')[0];
    return cleanUrl === urlPath;
  });
  if (match) {
    extracted.push({
      targetKey: target.key,
      targetPattern: target.pattern,
      found: true,
      name: match.name,
      folder: match.folder,
      method: match.method,
      url: match.url,
      headers: match.headers,
      bodyMode: match.bodyMode,
      bodyRaw: match.bodyRaw,
      responses: match.responses
    });
  } else {
    extracted.push({
      targetKey: target.key,
      targetPattern: target.pattern,
      found: false
    });
  }
}

fs.writeFileSync(path.resolve(__dirname, 'extracted_contracts.json'), JSON.stringify(extracted, null, 2), 'utf8');
console.log('Extracted targets count:', extracted.filter(e => e.found).length, 'of', targetPatterns.length);
