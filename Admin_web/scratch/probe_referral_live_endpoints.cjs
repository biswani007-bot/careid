const fs = require('fs');
const https = require('https');
const path = require('path');

const tokenData = JSON.parse(fs.readFileSync(path.join(__dirname, 'cached_token.json'), 'utf8'));
const token = tokenData.token;

function request(options, data = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          duration,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: null,
        error: err.message
      });
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('Testing live Referral endpoints against https://360api.vnvision.in...\n');

  const baseHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. GET /api/v1/referrals/dashboard/stats
  console.log('1. Probing GET /api/v1/referrals/dashboard/stats');
  const statsRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/dashboard/stats',
    method: 'GET',
    headers: baseHeaders
  });
  console.log(`Status: ${statsRes.statusCode} (${statsRes.duration}ms)`);
  console.log('Body:', JSON.stringify(statsRes.body, null, 2));

  // 2. GET /api/v1/referrals
  console.log('\n2. Probing GET /api/v1/referrals');
  const listRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals',
    method: 'GET',
    headers: baseHeaders
  });
  console.log(`Status: ${listRes.statusCode} (${listRes.duration}ms)`);
  console.log('Body:', JSON.stringify(listRes.body, null, 2).slice(0, 1000));

  // 3. GET /api/v1/referrals/my-incoming
  console.log('\n3. Probing GET /api/v1/referrals/my-incoming');
  const incomingRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/my-incoming',
    method: 'GET',
    headers: baseHeaders
  });
  console.log(`Status: ${incomingRes.statusCode} (${incomingRes.duration}ms)`);
  console.log('Body:', JSON.stringify(incomingRes.body, null, 2).slice(0, 500));

  // 4. GET /api/v1/referrals/my-outgoing
  console.log('\n4. Probing GET /api/v1/referrals/my-outgoing');
  const outgoingRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/referrals/my-outgoing',
    method: 'GET',
    headers: baseHeaders
  });
  console.log(`Status: ${outgoingRes.statusCode} (${outgoingRes.duration}ms)`);
  console.log('Body:', JSON.stringify(outgoingRes.body, null, 2).slice(0, 500));

  // 5. Check patients, doctors, facilities for creating referral
  console.log('\n5. Fetching sample Patient, Doctor, Facility IDs');
  const patRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/patients',
    method: 'GET',
    headers: baseHeaders
  });
  const docRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'GET',
    headers: baseHeaders
  });
  const facRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/facilities',
    method: 'GET',
    headers: baseHeaders
  });

  const patient = (patRes.body?.data || patRes.body)?.[0];
  const doctor = (docRes.body?.data || docRes.body)?.[0];
  const facility = (facRes.body?.data || facRes.body)?.[0];

  console.log('Patient:', patient ? { id: patient.id, name: patient.fullName || patient.firstName } : 'none');
  console.log('Doctor:', doctor ? { id: doctor.id, name: doctor.fullName } : 'none');
  console.log('Facility:', facility ? { id: facility.id, name: facility.facilityName || facility.name } : 'none');

  if (patient && doctor && facility) {
    // 6. Test POST /api/v1/referrals
    console.log('\n6. Probing POST /api/v1/referrals');
    const createPayload = {
      patientId: patient.id,
      receivingFacilityId: facility.id,
      receivingDoctorId: doctor.id,
      priority: 'URGENT',
      referralType: 'SPECIALIST_CONSULTATION',
      reasonForReferral: 'Patient presents with persistent chest pain and abnormal ECG findings',
      clinicalSummary: 'Blood pressure 145/95 mmHg, elevated cardiac markers',
      specialtyRequired: 'Cardiology'
    };
    console.log('Payload:', createPayload);
    const createRes = await request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/referrals',
      method: 'POST',
      headers: baseHeaders
    }, createPayload);
    console.log(`Status: ${createRes.statusCode} (${createRes.duration}ms)`);
    console.log('Body:', JSON.stringify(createRes.body, null, 2));

    if (createRes.statusCode === 201 || createRes.statusCode === 200) {
      const newReferralId = createRes.body?.data?.id || createRes.body?.id;
      console.log('Created referral ID:', newReferralId);
      if (newReferralId) {
        // Test details, notes, attachments, history
        console.log(`\n7. Probing GET /api/v1/referrals/${newReferralId}`);
        const detRes = await request({
          hostname: '360api.vnvision.in',
          path: `/api/v1/referrals/${newReferralId}`,
          method: 'GET',
          headers: baseHeaders
        });
        console.log(`Status: ${detRes.statusCode}`, detRes.body);

        console.log(`\n8. Probing GET /api/v1/referrals/${newReferralId}/notes`);
        const notesRes = await request({
          hostname: '360api.vnvision.in',
          path: `/api/v1/referrals/${newReferralId}/notes`,
          method: 'GET',
          headers: baseHeaders
        });
        console.log(`Status: ${notesRes.statusCode}`, notesRes.body);

        console.log(`\n9. Probing GET /api/v1/referrals/${newReferralId}/history`);
        const histRes = await request({
          hostname: '360api.vnvision.in',
          path: `/api/v1/referrals/${newReferralId}/history`,
          method: 'GET',
          headers: baseHeaders
        });
        console.log(`Status: ${histRes.statusCode}`, histRes.body);

        console.log(`\n10. Probing GET /api/v1/referrals/${newReferralId}/attachments`);
        const attRes = await request({
          hostname: '360api.vnvision.in',
          path: `/api/v1/referrals/${newReferralId}/attachments`,
          method: 'GET',
          headers: baseHeaders
        });
        console.log(`Status: ${attRes.statusCode}`, attRes.body);
      }
    }
  }
}

run();

