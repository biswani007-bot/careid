const fs = require('fs');
const https = require('https');

let cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

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

async function ensureFreshToken() {
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
    console.log('Token refreshed successfully!');
  } else {
    console.log('Refresh failed, attempting OTP...');
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
    cached.accessToken = verifyRes.body.data.accessToken;
    cached.token = verifyRes.body.data.accessToken;
    cached.refreshToken = verifyRes.body.data.refreshToken;
    cached.expiresAt = Date.now() + 14 * 60 * 1000;
    fs.writeFileSync('scratch/cached_token.json', JSON.stringify(cached, null, 2));
    console.log('Obtained fresh token via OTP!');
  }
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const defaultHeaders = {
      Authorization: `Bearer ${cached.accessToken}`,
      Accept: 'application/json',
      ...headers,
    };
    if (body && !defaultHeaders['Content-Type'] && typeof body === 'string') {
      defaultHeaders['Content-Type'] = 'application/json';
      defaultHeaders['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: defaultHeaders,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: b });
        }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  await ensureFreshToken();

  console.log('\n--- Testing 1: GET /api/v1/admin/medical-records ---');
  const listAdmin = await makeRequest('GET', '/api/v1/admin/medical-records?limit=5');
  console.log('GET /admin/medical-records status:', listAdmin.status);
  console.log('Sample body:', JSON.stringify(listAdmin.body).slice(0, 300));

  console.log('\n--- Testing 2: GET /api/v1/medical-records ---');
  const listMed = await makeRequest('GET', '/api/v1/medical-records?limit=5');
  console.log('GET /medical-records status:', listMed.status);
  console.log('Sample body:', JSON.stringify(listMed.body).slice(0, 300));

  console.log('\n--- Testing 3: POST /api/v1/medical-records ---');
  const patientProfileId = '06584c77-0109-4774-906e-f14a16db8470'; // Lucas Vance
  const postMed = await makeRequest('POST', '/api/v1/medical-records', JSON.stringify({
    patientProfileId,
    title: 'Routine Health Checkup',
    chiefComplaint: 'Annual routine physical examination',
    clinicalNotes: 'Vital signs normal. Patient in good health.',
    treatmentPlan: 'Maintain current diet and exercise routine',
    followUpInstructions: 'Return in 1 year for annual checkup',
    status: 'FINAL'
  }));
  console.log('POST /medical-records status:', postMed.status);
  console.log('POST /medical-records body:', JSON.stringify(postMed.body).slice(0, 400));

  console.log('\n--- Testing 4: POST /api/v1/records ---');
  const postRec = await makeRequest('POST', '/api/v1/records', JSON.stringify({
    patientProfileId,
    title: 'Dental Panoramic X-Ray',
    chiefComplaint: 'Tooth sensitivity',
    clinicalNotes: 'Mandibular evaluation',
    treatmentPlan: 'Fluoride application',
    status: 'FINAL'
  }));
  console.log('POST /records status:', postRec.status);
  console.log('POST /records body:', JSON.stringify(postRec.body).slice(0, 400));
})();
