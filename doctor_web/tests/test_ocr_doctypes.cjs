const https = require('https');

function postJson(path, body, token) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request('https://360api.vnvision.in/api/v1' + path, {
      method: 'POST',
      headers
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resp) }));
    });
    req.write(data);
    req.end();
  });
}

async function run() {
  const fs = require('fs');
  const token = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')).accessToken;

  const attId = '0f3e8100-7694-4f67-aed1-048a903042f7';

  const types = [
    'LAB_REPORT',
    'PRESCRIPTION',
    'DISCHARGE_SUMMARY',
    'ID_CARD',
    'INSURANCE_CARD',
    'DIAGNOSTIC_IMAGE',
    'GENERAL_MEDICAL',
    'OTHER',
    'UNKNOWN'
  ];

  for (const t of types) {
    const res = await postJson('/ocr/jobs', { medicalAttachmentId: attId, documentType: t }, token);
    console.log(`DocumentType: ${t.padEnd(20)} -> Status: ${res.status} Error: ${res.body?.error || 'NONE'}`);
  }
}

run().catch(console.error);
