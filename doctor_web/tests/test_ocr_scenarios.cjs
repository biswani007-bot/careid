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

async function testScenarios() {
  const token = await login();
  console.log('Logged in.');

  // 1. Upload a PDF
  // Generate a valid minimal PDF
  const minimalPdf = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <<>>>> endobj
4 0 obj <</Length 44>> stream
BT
/F1 12 Tf
72 712 Td
(Blood Panel Lab Report) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
310
%%EOF`;

  const pdfBuffer = Buffer.from(minimalPdf);
  console.log('Uploading PDF to /attachments...');
  const uploadPdfRes = await uploadMultipart(
    '/attachments',
    'minimal.pdf',
    pdfBuffer,
    'application/pdf',
    { category: 'LAB_RESULT', patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a' },
    token
  );
  console.log('PDF upload status:', uploadPdfRes.status);
  const pdfAttId = uploadPdfRes.body?.data?.id;

  if (pdfAttId) {
    console.log('Testing /ocr/jobs with PDF...');
    const pdfJobRes = await postJson('/ocr/jobs', {
      medicalAttachmentId: pdfAttId,
      documentType: 'LAB_REPORT'
    }, token);
    console.log('PDF /ocr/jobs status:', pdfJobRes.status, JSON.stringify(pdfJobRes.body || pdfJobRes.raw));
  }

  // 2. Test /api/v1/ai/ocr/extract
  console.log('\nTesting POST /api/v1/ai/ocr/extract...');
  const aiOcrRes = await postJson('/ai/ocr/extract', {
    documentId: pdfAttId || '06d865e6-242a-4b23-8ffa-944a67143571',
  }, token);
  console.log('/ai/ocr/extract status:', aiOcrRes.status, JSON.stringify(aiOcrRes.body || aiOcrRes.raw));

  // 3. Test /api/v1/insurance/ocr/scan or /insurance/ocr
  console.log('\nTesting POST /api/v1/insurance/ocr...');
  const insRes = await postJson('/insurance/ocr', {
    imageUrl: 'https://storage.healthvault360.com/cards/sample-insurance-card.jpg',
    patientId: '787e5187-7859-4320-bb1a-465a57dd086a'
  }, token);
  console.log('/insurance/ocr status:', insRes.status, JSON.stringify(insRes.body || insRes.raw));
}

testScenarios().catch(console.error);

