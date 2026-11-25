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

async function testFullOcr() {
  const token = await login();
  console.log('1. Logged in successfully.');

  const fileBuffer = fs.readFileSync('src/assets/medical/scanned-lab-report.png');

  console.log('2. Uploading attachment to POST /api/v1/attachments...');
  const uploadRes = await uploadMultipart(
    '/attachments',
    'scanned-lab-report.png',
    fileBuffer,
    'image/png',
    { category: 'LAB_RESULT', patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a' },
    token
  );
  console.log('Upload status:', uploadRes.status);
  console.log('Upload response:', JSON.stringify(uploadRes.body || uploadRes.raw));

  const attachmentId = uploadRes.body?.data?.id || uploadRes.body?.id;
  if (!attachmentId) {
    console.error('Failed to get attachmentId');
    return;
  }

  console.log('3. Submitting OCR job with attachmentId:', attachmentId);
  const ocrJobRes = await postJson('/ocr/jobs', {
    medicalAttachmentId: attachmentId,
    documentType: 'LAB_REPORT'
  }, token);

  console.log('OCR Job Submit Status:', ocrJobRes.status);
  console.log('OCR Job Submit Body:', JSON.stringify(ocrJobRes.body || ocrJobRes.raw));
}

testFullOcr().catch(console.error);
