const fs = require('fs');
const https = require('https');

const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function apiRequest(options, data) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      headers: {
        Authorization: `Bearer ${cached.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      ...options
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('1. Checking attachments in patient medical records...');
  // Check the patient that has 305 medical records:
  // Patient ID from sample: 787e5187-7859-4320-bb1a-465a57dd086a (Karcus Doe)
  const patientId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const patRecordsRes = await apiRequest({
    path: `/api/v1/admin/patients/${patientId}/medical-records?page=1&limit=5`,
    method: 'GET'
  });
  console.log('Patient records response status:', patRecordsRes.status, 'Count:', patRecordsRes.body?.data?.length);
  if (patRecordsRes.body?.data?.length > 0) {
    const r = patRecordsRes.body.data[0];
    console.log('Record ID:', r.id, 'Title:', r.title, 'Attachments in record:', r.attachments);
  }

  // 2. Check attachments linked to a medical record via GET /api/v1/medical-records/:id/attachments
  const sampleRecordId = '4f6e73c6-6711-407e-9823-79d433d887fd';
  const attRes = await apiRequest({
    path: `/api/v1/medical-records/${sampleRecordId}/attachments`,
    method: 'GET'
  });
  console.log('GET /api/v1/medical-records/:id/attachments status:', attRes.status, attRes.body);

  // 3. Check attachments linked to another record
  const allAttRes = await apiRequest({
    path: '/api/v1/attachments?page=1&limit=10',
    method: 'GET'
  });
  console.log('GET /api/v1/attachments status:', allAttRes.status, allAttRes.body);
})();

