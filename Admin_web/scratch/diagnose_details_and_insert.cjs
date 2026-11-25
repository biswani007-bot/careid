const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, 'cached_token.json');
const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
const token = tokenData.token;

function apiRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = https.request({
      hostname: '360api.vnvision.in',
      port: 443,
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTimeMs = Date.now() - startTime;
        let json;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
          responseTimeMs
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  console.log('--- Probing Patients Endpoint Structure ---');
  const patRes = await apiRequest({ path: '/api/v1/patients?limit=2', method: 'GET' });
  console.log('Patients response keys:', Object.keys(patRes.body));
  const patientsList = patRes.body?.data?.patients || patRes.body?.data || patRes.body?.patients || patRes.body;
  console.log('First patient item:', JSON.stringify(patientsList?.[0] || patientsList, null, 2));

  const validPatientId = patientsList?.[0]?.id || patientsList?.[0]?.patientId || 'b1c8f188-75b2-4d10-9cbb-927cfc1d9361';
  console.log('Valid patientId:', validPatientId);

  console.log('\n--- Probing GET /api/v1/referrals/:id with non-existent UUID ---');
  const dummyIdRes = await apiRequest({ path: '/api/v1/referrals/00000000-0000-0000-0000-000000000000', method: 'GET' });
  console.log('Dummy ID status:', dummyIdRes.status, '| Body:', JSON.stringify(dummyIdRes.body));

  const dummyIdRes2 = await apiRequest({ path: '/api/v1/referrals/11111111-2222-3333-4444-555555555555', method: 'GET' });
  console.log('Dummy ID 2 status:', dummyIdRes2.status, '| Body:', JSON.stringify(dummyIdRes2.body));

  console.log('\n--- Probing Facility Metro General Hospital Doctors ---');
  const facId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  const facDocs = await apiRequest({ path: `/api/v1/facilities/${facId}/doctors`, method: 'GET' });
  const docList = facDocs.body?.data || facDocs.body;
  const doc1 = docList[0];
  console.log('Affiliated Doctor 1:', doc1);

  console.log('\n--- Probing POST /api/v1/referrals with Valid Patient and Affiliated Doctor ---');
  const payload = {
    patientId: validPatientId,
    receivingFacilityId: facId,
    receivingDoctorId: doc1.id,
    priority: 'URGENT',
    referralType: 'SPECIALIST_CONSULTATION',
    reasonForReferral: 'Patient presents with persistent chest pain and abnormal ECG findings',
    clinicalSummary: 'Blood pressure 145/95 mmHg, elevated cardiac markers',
    specialtyRequired: 'Cardiology'
  };
  console.log('Sending payload:', JSON.stringify(payload, null, 2));
  const postRes = await apiRequest({ path: '/api/v1/referrals', method: 'POST' }, payload);
  console.log('POST /api/v1/referrals Result -> Status:', postRes.status, '| Time:', postRes.responseTimeMs, 'ms | Body:', JSON.stringify(postRes.body));

  console.log('\n--- Probing POST /api/v1/referrals with Unaffiliated Doctor ---');
  const unPayload = {
    patientId: validPatientId,
    receivingFacilityId: facId,
    receivingDoctorId: '00000000-0000-0000-0000-000000000000',
    priority: 'URGENT',
    referralType: 'SPECIALIST_CONSULTATION',
    reasonForReferral: 'Patient presents with persistent chest pain and abnormal ECG findings'
  };
  const unPostRes = await apiRequest({ path: '/api/v1/referrals', method: 'POST' }, unPayload);
  console.log('Unaffiliated Doctor Result -> Status:', unPostRes.status, '| Time:', unPostRes.responseTimeMs, 'ms | Body:', JSON.stringify(unPostRes.body));
}

run().catch(console.error);

