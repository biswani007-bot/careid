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
  const patientProfileId = '06584c77-0109-4774-906e-f14a16db8470';
  const dummyPdf = Buffer.from('%PDF-1.4 ... dummy dental record ... %%EOF');

  // Let's test categories on /api/v1/attachments
  const categories = ['MEDICAL', 'DENTAL', 'VISION', 'PRESCRIPTION', 'LAB_REPORT', 'IMAGING', 'CLINICAL_NOTE', 'OTHER'];
  for (const cat of categories) {
    const res = await uploadMultipart(
      '/api/v1/attachments',
      {
        patientProfileId,
        category: cat
      },
      'file',
      `test_${cat.toLowerCase()}.pdf`,
      dummyPdf,
      'application/pdf'
    );
    console.log(`Category "${cat}": status=${res.status}, returnedCategory="${res.body?.data?.category}"`);
  }
})();

