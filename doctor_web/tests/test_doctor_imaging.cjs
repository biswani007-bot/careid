const fs = require('fs');
const https = require('https');

const tokenCache = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8'));
const doctorToken = tokenCache.accessToken;

function post(path, data, token) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'POST',
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

function get(path, token) {
  return new Promise((resolve) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
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
    req.end();
  });
}

async function main() {
  const testRecId = 'e0f8c72a-2b07-4c8d-874d-27d721b18d64';

  console.log('--- Testing /reports/:id/verify with Doctor Token ---');
  const verifyRes = await post(`/reports/${testRecId}/verify`, { notes: 'Study reviewed and verified by attending clinician' }, doctorToken);
  console.log(`POST /reports/${testRecId}/verify status: ${verifyRes.status}`, JSON.stringify(verifyRes.data));

  console.log('\n--- Testing /attachments endpoints ---');
  // From Postman: GET /attachments/:id
  const attMeta = await get(`/attachments/52db0a11b55e5b51c89af9c97f1c750a2f58dd88c4b1f9f135f48ea7b61ccade`, doctorToken);
  console.log(`GET /attachments/:id status: ${attMeta.status}`, JSON.stringify(attMeta.data));

  // From Postman: GET /attachments/:id/download-url
  const attDl = await get(`/attachments/52db0a11b55e5b51c89af9c97f1c750a2f58dd88c4b1f9f135f48ea7b61ccade/download-url`, doctorToken);
  console.log(`GET /attachments/:id/download-url status: ${attDl.status}`, JSON.stringify(attDl.data));

  // From Postman: GET /attachments/file/:filename
  const attFile = await get(`/attachments/file/787e5187-7859-4320-bb1a-465a57dd086a-1794245104212-record_attachment.png`, doctorToken);
  console.log(`GET /attachments/file/:filename status: ${attFile.status}`);
}

main();
