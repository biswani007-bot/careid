const { apiGet, getFreshToken } = require('./api_helper.cjs');
const https = require('https');
const fs = require('fs');

function uploadMultipart(token, fields, fileName, fileBuffer) {
  return new Promise((resolve) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.alloc(0);

    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null) {
        const fieldHead = `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        body = Buffer.concat([body, Buffer.from(fieldHead)]);
      }
    }

    if (fileName && fileBuffer) {
      const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`;
      body = Buffer.concat([body, Buffer.from(fileHead), fileBuffer, Buffer.from('\r\n')]);
    }

    body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/attachments',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Accept: 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  const token = await getFreshToken();
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a'; // Karcus Doe

  // Test invalid category to reveal enum
  const resInvalid = await uploadMultipart(
    token,
    { patientProfileId, category: 'INVALID_ENUM_PROBE' },
    'test.pdf',
    dummyPdf
  );
  console.log('Category enum probe response:', resInvalid.status, JSON.stringify(resInvalid.body, null, 2));

  // Test documentType / clinicalCategory / specialty / metadata fields
  const resMeta = await uploadMultipart(
    token,
    {
      patientProfileId,
      category: 'IMAGING_STUDY',
      clinicalCategory: 'VISION',
      specialty: 'OPHTHALMOLOGY',
      description: 'Vision fundus retinal scan',
      documentType: 'VISION_RECORD',
      title: 'Vision Retinal Scan'
    },
    'vision_test.pdf',
    dummyPdf
  );
  console.log('Metadata probe response:', resMeta.status, JSON.stringify(resMeta.body, null, 2));
})();
