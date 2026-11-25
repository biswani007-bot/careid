const fs = require('fs');
const https = require('https');

let cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function uploadMultipart(path, fields, fileField, fileName, fileBuffer, mimeType) {
  return new Promise((resolve) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.alloc(0);

    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null) {
        const fieldHead = `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        body = Buffer.concat([body, Buffer.from(fieldHead)]);
      }
    }

    if (fileField && fileName && fileBuffer) {
      const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
      body = Buffer.concat([body, Buffer.from(fileHead), fileBuffer, Buffer.from('\r\n')]);
    }

    body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cached.accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Accept: 'application/json'
      }
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
    req.write(body);
    req.end();
  });
}

(async () => {
  const recordId = '4f6e73c6-6711-407e-9823-79d433d887fd';
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const dummyPdf = Buffer.from('%PDF-1.4 ... dental record scan ... %%EOF');

  console.log('Testing POST /api/v1/medical-records/:id/attachments with patientProfileId:');
  const r1 = await uploadMultipart(
    `/api/v1/medical-records/${recordId}/attachments`,
    {
      patientProfileId,
      category: 'CLINICAL_NOTE'
    },
    'file',
    'clinical_xray.pdf',
    dummyPdf,
    'application/pdf'
  );
  console.log('r1 status:', r1.status, JSON.stringify(r1.body));

  // Also check listing attachments for this record
  const listReq = https.request({
    hostname: '360api.vnvision.in',
    path: `/api/v1/medical-records/${recordId}/attachments`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cached.accessToken}`,
      Accept: 'application/json'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => console.log('GET attachments status:', res.statusCode, b));
  });
  listReq.end();
})();
