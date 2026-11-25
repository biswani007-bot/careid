const fs = require('fs');
const https = require('https');

const tokenCache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenCache.accessToken;

function put(path, data, token) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Authorization': 'Bearer ' + token
    };
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'PUT',
      headers: headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, data: b });
        }
      });
    });
    req.write(payload);
    req.end();
  });
}

async function test() {
  const marcusId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const testRecId = 'e0f8c72a-2b07-4c8d-874d-27d721b18d64';
  
  console.log(`Testing PUT /doctors/patients/${marcusId}/medical-records/${testRecId}...`);
  const res = await put(`/doctors/patients/${marcusId}/medical-records/${testRecId}`, {
    status: 'FINAL',
    clinicalNotes: 'Testing document linkage for attachment att-787e5187-7859-4320-bb1a-465a57dd086a-1794245097221-record_attachment.png (Verified by Attending Clinician)'
  }, doctorToken);

  console.log('Status:', res.status);
  console.log('Data:', JSON.stringify(res.data));
}

test();

