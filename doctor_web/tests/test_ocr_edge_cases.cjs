const https = require('https');
const fs = require('fs');

async function login() {
  const reqRes = await postJson('/auth/otp/request', { phone: '+16505550003' });
  const cid = reqRes.body.data.challengeId;
  const verRes = await postJson('/auth/otp/verify', { challengeId: cid, otpCode: '123456' });
  return verRes.body.data.accessToken;
}

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
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(resp) }); }
        catch { resolve({ status: res.statusCode, raw: resp }); }
      });
    });
    req.write(data);
    req.end();
  });
}

function uploadMultipart(path, filename, buffer, mimeType, fields, token) {
  return new Promise((resolve) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const chunks = [];

    for (const [k, v] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }

    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
    chunks.push(buffer);
    chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBody = Buffer.concat(chunks);

    const req = https.request('https://360api.vnvision.in/api/v1' + path, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(resp) }); }
        catch { resolve({ status: res.statusCode, raw: resp }); }
      });
    });
    req.write(fullBody);
    req.end();
  });
}

async function testEdgeCases() {
  const token = await login();

  // Test 1: Upload a DICOM / arbitrary file format
  console.log('Test 1: Uploading text file disguised as PDF or JPEG...');
  const fakePdf = Buffer.from('NOT A REAL PDF FILE');
  const up1 = await uploadMultipart(
    '/attachments',
    'corrupt.pdf',
    fakePdf,
    'application/pdf',
    { category: 'LAB_RESULT', patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a' },
    token
  );
  console.log('Corrupt upload status:', up1.status); // 400

  // Test 2: DocumentType edge cases
  const fileBuffer = fs.readFileSync('src/assets/medical/scanned-lab-report.png');
  const up2 = await uploadMultipart(
    '/attachments',
    'test2.png',
    fileBuffer,
    'image/png',
    { category: 'LAB_RESULT', patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a' },
    token
  );
  const attId = up2.body?.data?.id;
  console.log('Valid upload attId:', attId);

  if (attId) {
    // Test 2a: Invalid documentType
    const r1 = await postJson('/ocr/jobs', {
      medicalAttachmentId: attId,
      documentType: 'INVALID_TYPE'
    }, token);
    console.log('Invalid documentType status:', r1.status, JSON.stringify(r1.body || r1.raw));

    // Test 2b: Missing documentType
    const r2 = await postJson('/ocr/jobs', {
      medicalAttachmentId: attId
    }, token);
    console.log('Missing documentType status:', r2.status, JSON.stringify(r2.body || r2.raw));

    // Test 2c: Empty body
    const r3 = await postJson('/ocr/jobs', {}, token);
    console.log('Empty body status:', r3.status, JSON.stringify(r3.body || r3.raw));
  }
}

testEdgeCases().catch(console.error);

