const fs = require('fs');
const https = require('https');

let cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const defaultHeaders = {
      Authorization: `Bearer ${cached.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (body) {
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
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  // Test sending empty object to /api/v1/medical-records to see validation errors
  const resEmpty = await makeRequest('POST', '/api/v1/medical-records', JSON.stringify({}));
  console.log('Empty POST /medical-records:', resEmpty.status, resEmpty.body);

  // Test sending dummy fields
  const resDummy = await makeRequest('POST', '/api/v1/medical-records', JSON.stringify({ foo: 'bar' }));
  console.log('Dummy POST /medical-records:', resDummy.status, resDummy.body);

  // Test what Postman had:
  // Postman sample:
  /*
  {
    "title": "Annual Routine Health Checkup",
    "chiefComplaint": "Mild fatigue and occasional headache",
    "clinicalNotes": "Patient appears well nourished. No acute distress.",
    "treatmentPlan": "Increase fluid intake, maintain low glycemic diet",
    "followUpInstructions": "Follow up in 4 weeks for repeat blood pressure check.",
    "status": "FINAL"
  }
  */
  const resPostman = await makeRequest('POST', '/api/v1/medical-records', JSON.stringify({
    title: "Annual Routine Health Checkup",
    chiefComplaint: "Mild fatigue and occasional headache",
    clinicalNotes: "Patient appears well nourished. No acute distress.",
    treatmentPlan: "Increase fluid intake, maintain low glycemic diet",
    followUpInstructions: "Follow up in 4 weeks",
    status: "FINAL"
  }));
  console.log('Postman body POST /medical-records:', resPostman.status, resPostman.body);
})();

