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
  console.log('====================================================');
  console.log('CAREID REFERRALS 500 DEEP INVESTIGATION');
  console.log('====================================================\n');

  // 1. Stats endpoint
  console.log('--- 1. Testing GET /api/v1/referrals/dashboard/stats ---');
  const statsRes = await apiRequest({ path: '/api/v1/referrals/dashboard/stats', method: 'GET' });
  console.log('HTTP Status:', statsRes.status);
  console.log('Response Time:', statsRes.responseTimeMs, 'ms');
  console.log('Response Body:', JSON.stringify(statsRes.body, null, 2));

  // 2. Listing endpoint with various params
  console.log('\n--- 2. Testing GET /api/v1/referrals (various query combinations) ---');
  const queryCombos = [
    { label: 'No params', path: '/api/v1/referrals' },
    { label: 'Pagination: page=1&limit=10', path: '/api/v1/referrals?page=1&limit=10' },
    { label: 'Limit 1: page=1&limit=1', path: '/api/v1/referrals?page=1&limit=1' },
    { label: 'Status ACCEPTED: status=ACCEPTED', path: '/api/v1/referrals?status=ACCEPTED' },
    { label: 'Status PENDING: status=PENDING', path: '/api/v1/referrals?status=PENDING' },
    { label: 'Facility 3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', path: '/api/v1/referrals?receivingFacilityId=3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb' },
  ];

  for (const q of queryCombos) {
    const res = await apiRequest({ path: q.path, method: 'GET' });
    console.log(`[${q.label}] -> Status: ${res.status} | Time: ${res.responseTimeMs}ms | Body:`, JSON.stringify(res.body));
  }

  // 3. Check incoming/outgoing endpoints
  console.log('\n--- 3. Testing GET /api/v1/referrals/my-incoming & my-outgoing ---');
  const incRes = await apiRequest({ path: '/api/v1/referrals/my-incoming', method: 'GET' });
  console.log('my-incoming -> Status:', incRes.status, '| Body:', JSON.stringify(incRes.body));
  const outRes = await apiRequest({ path: '/api/v1/referrals/my-outgoing', method: 'GET' });
  console.log('my-outgoing -> Status:', outRes.status, '| Body:', JSON.stringify(outRes.body));

  // 4. Check audit logs to find referral IDs
  console.log('\n--- 4. Checking Audit Logs for Referral Events ---');
  const auditRes = await apiRequest({ path: '/api/v1/admin/audit-logs?limit=50', method: 'GET' });
  if (auditRes.status === 200 && Array.isArray(auditRes.body?.data || auditRes.body)) {
    const logs = auditRes.body.data || auditRes.body;
    console.log(`Retrieved ${logs.length} audit logs. Looking for referral entries...`);
    const refLogs = logs.filter(l => 
      (l.action && l.action.toLowerCase().includes('referral')) ||
      (l.resource && l.resource.toLowerCase().includes('referral')) ||
      (l.details && JSON.stringify(l.details).toLowerCase().includes('referral'))
    );
    console.log(`Found ${refLogs.length} referral-related logs:`, JSON.stringify(refLogs, null, 2));
  } else {
    console.log('Audit response:', auditRes.status, auditRes.body);
  }

  // 5. Test POST /api/v1/referrals with different doctor/facility/patient IDs
  console.log('\n--- 5. Testing POST /api/v1/referrals variations ---');
  
  // Get active patients, facilities, doctors
  const patientsRes = await apiRequest({ path: '/api/v1/patients?limit=5', method: 'GET' });
  const facilitiesRes = await apiRequest({ path: '/api/v1/facilities', method: 'GET' });
  const doctorsRes = await apiRequest({ path: '/api/v1/doctors?limit=5', method: 'GET' });

  const patient = patientsRes.body?.data?.[0] || patientsRes.body?.[0];
  const facility = Array.isArray(facilitiesRes.body) ? facilitiesRes.body[0] : facilitiesRes.body?.data?.[0];
  const doctor = doctorsRes.body?.doctors?.[0] || doctorsRes.body?.[0];

  console.log('Sample Patient ID:', patient?.id);
  console.log('Sample Facility ID:', facility?.id || facility?.facilityId);
  console.log('Sample Doctor ID:', doctor?.id);

  // If facility has affiliated doctors:
  const targetFacId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb'; // Metro General Hospital
  const facDocsRes = await apiRequest({ path: `/api/v1/facilities/${targetFacId}/doctors`, method: 'GET' });
  console.log('Metro General Hospital Affiliated Doctors:', JSON.stringify(facDocsRes.body, null, 2));

  const affiliatedDoc = Array.isArray(facDocsRes.body) ? facDocsRes.body[0] : null;
  const affiliatedDocId = affiliatedDoc?.doctorId || affiliatedDoc?.id;
  console.log('Target Affiliated Doctor ID:', affiliatedDocId);

  // Test payload 1: minimal valid payload (required fields only: patientId, receivingFacilityId, reasonForReferral)
  console.log('\nSubmitting Minimal Payload (required fields only)...');
  const minimalPayload = {
    patientId: patient?.id,
    receivingFacilityId: targetFacId,
    reasonForReferral: 'Patient presents with persistent chest pain and abnormal ECG findings'
  };
  const postRes1 = await apiRequest({ path: '/api/v1/referrals', method: 'POST' }, minimalPayload);
  console.log('Minimal Payload -> Status:', postRes1.status, '| Time:', postRes1.responseTimeMs, 'ms | Body:', JSON.stringify(postRes1.body));

  // Test payload 2: Full payload with affiliated doctor
  if (affiliatedDocId) {
    console.log('\nSubmitting Full Payload with Affiliated Doctor...');
    const fullPayload = {
      patientId: patient?.id,
      receivingFacilityId: targetFacId,
      receivingDoctorId: affiliatedDocId,
      priority: 'URGENT',
      referralType: 'SPECIALIST_CONSULTATION',
      reasonForReferral: 'Patient presents with persistent chest pain and abnormal ECG findings',
      clinicalSummary: 'Blood pressure 145/95 mmHg, elevated cardiac markers',
      specialtyRequired: 'Cardiology'
    };
    const postRes2 = await apiRequest({ path: '/api/v1/referrals', method: 'POST' }, fullPayload);
    console.log('Full Payload -> Status:', postRes2.status, '| Time:', postRes2.responseTimeMs, 'ms | Body:', JSON.stringify(postRes2.body));
  }

  // 6. Test Doctor authentication if available
  console.log('\n--- 6. Checking for Doctor users in /api/v1/users ---');
  const docUsersRes = await apiRequest({ path: '/api/v1/users?role=DOCTOR', method: 'GET' });
  console.log('Doctor users status:', docUsersRes.status);
  const docUsers = docUsersRes.body?.users || docUsersRes.body?.data || docUsersRes.body;
  if (Array.isArray(docUsers)) {
    console.log(`Found ${docUsers.length} doctor users:`, docUsers.map(u => ({ id: u.id, email: u.email, phone: u.phone, roles: u.roles })));
  }
}

run().catch(console.error);

