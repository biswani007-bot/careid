const fs = require('fs');
const https = require('https');

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFreshToken() {
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached && cached.refreshToken) {
        const refData = JSON.stringify({ refreshToken: cached.refreshToken });
        const refRes = await httpRequest({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/token/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(refData) }
        }, refData);
        if (refRes.status === 200 && refRes.body?.data?.accessToken) {
          cached.accessToken = refRes.body.data.accessToken;
          cached.token = refRes.body.data.accessToken;
          cached.refreshToken = refRes.body.data.refreshToken || cached.refreshToken;
          cached.expiresAt = Date.now() + 14 * 60 * 1000;
          fs.writeFileSync('scratch/cached_token.json', JSON.stringify(cached, null, 2));
          return cached;
        }
      }
    } catch {}
  }

  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const authData = verifyRes.body?.data;
  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  return tokenPayload;
}

(async () => {
  const auth = await getFreshToken();
  const token = auth.accessToken;

  function apiGet(path) {
    return httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
  }

  function apiPost(path, data) {
    return httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Accept: 'application/json'
      }
    }, data);
  }

  console.log('1. Querying /api/v1/admin/medical-records with different limits...');
  const resLimit1 = await apiGet('/api/v1/admin/medical-records?page=1&limit=1');
  console.log('limit=1 response structure:', {
    status: resLimit1.status,
    isDataArray: Array.isArray(resLimit1.body?.data),
    dataLength: Array.isArray(resLimit1.body?.data) ? resLimit1.body.data.length : null,
    meta: resLimit1.body?.meta,
    pagination: resLimit1.body?.pagination,
    total: resLimit1.body?.total
  });

  const res50 = await apiGet('/api/v1/admin/medical-records?page=1&limit=50');
  const records50 = Array.isArray(res50.body?.data) ? res50.body.data : res50.body?.data?.records || [];
  console.log(`limit=50 returned ${records50.length} records. Top level metadata:`, {
    status: res50.status,
    meta: res50.body?.meta,
    total: res50.body?.total,
    pagination: res50.body?.pagination
  });

  const res100 = await apiGet('/api/v1/admin/medical-records?page=1&limit=100');
  const records100 = Array.isArray(res100.body?.data) ? res100.body.data : res100.body?.data?.records || [];
  console.log(`limit=100 returned ${records100.length} records. Top level metadata:`, {
    status: res100.status,
    meta: res100.body?.meta
  });

  const resPage2 = await apiGet('/api/v1/admin/medical-records?page=2&limit=50');
  const recordsPage2 = Array.isArray(resPage2.body?.data) ? resPage2.body.data : resPage2.body?.data?.records || [];
  console.log(`page=2&limit=50 returned ${recordsPage2.length} records.`);

  if (records50.length > 0) {
    console.log('\nSample record structure:');
    const sample = records50[0];
    console.log(JSON.stringify(sample, null, 2).slice(0, 800));
  }

  console.log('\n2. Testing creating medical record for patient via various endpoints...');
  const patientProfileId = '06584c77-0109-4774-906e-f14a16db8470'; // Lucas Vance

  const testRecordPayload = JSON.stringify({
    title: 'Comprehensive Physical Examination & Diagnostic Evaluation',
    chiefComplaint: 'Routine annual preventive health assessment',
    clinicalNotes: 'Vital signs within normal limits. Cardiac and pulmonary examination unremarkable.',
    treatmentPlan: 'Maintain active lifestyle and balanced diet. Routine follow-up in 12 months.',
    status: 'FINAL'
  });

  const docEndpointRes = await apiPost(`/api/v1/doctors/patients/${patientProfileId}/medical-records`, testRecordPayload);
  console.log('POST /api/v1/doctors/patients/:id/medical-records status:', docEndpointRes.status, docEndpointRes.body);

  const generalEndpointRes = await apiPost('/api/v1/medical-records', testRecordPayload);
  console.log('POST /api/v1/medical-records status:', generalEndpointRes.status, generalEndpointRes.body);

  const adminPatientRecordRes = await apiPost(`/api/v1/admin/patients/${patientProfileId}/medical-records`, testRecordPayload);
  console.log('POST /api/v1/admin/patients/:id/medical-records status:', adminPatientRecordRes.status, adminPatientRecordRes.body);

  const adminRecordRes = await apiPost('/api/v1/admin/medical-records', testRecordPayload);
  console.log('POST /api/v1/admin/medical-records status:', adminRecordRes.status, adminRecordRes.body);

  // Check supported query filters on GET /api/v1/admin/medical-records
  console.log('\n3. Testing query filters on GET /api/v1/admin/medical-records...');
  const resFilterStatus = await apiGet('/api/v1/admin/medical-records?status=FINAL&limit=5');
  console.log('Filter status=FINAL count:', resFilterStatus.body?.data?.length);

  const resFilterQ = await apiGet('/api/v1/admin/medical-records?q=Lucas&limit=5');
  console.log('Filter q=Lucas count:', resFilterQ.body?.data?.length);

  const resFilterPat = await apiGet(`/api/v1/admin/medical-records?patientProfileId=${patientProfileId}&limit=5`);
  console.log('Filter patientProfileId count:', resFilterPat.body?.data?.length);
})();
