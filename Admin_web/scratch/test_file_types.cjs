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
  const patientProfileId = '06584c77-0109-4774-906e-f14a16db8470'; // Lucas Vance

  console.log('1. Testing PDF upload:');
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
  const pdfRes = await uploadMultipart(
    '/api/v1/attachments',
    { patientProfileId, category: 'CLINICAL_NOTE' },
    'file',
    'medical_intake_report.pdf',
    dummyPdf,
    'application/pdf'
  );
  console.log('PDF upload status:', pdfRes.status, 'ID:', pdfRes.body?.data?.id);

  console.log('\n2. Testing PNG image upload:');
  // Simple 1x1 transparent PNG buffer
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const pngRes = await uploadMultipart(
    '/api/v1/attachments',
    { patientProfileId, category: 'IMAGING_STUDY' },
    'file',
    'panoramic_dental_scan.png',
    dummyPng,
    'image/png'
  );
  console.log('PNG upload status:', pngRes.status, 'ID:', pngRes.body?.data?.id);

  console.log('\n3. Testing JPEG image upload:');
  const dummyJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0xff, 0xd9]);
  const jpgRes = await uploadMultipart(
    '/api/v1/attachments',
    { patientProfileId, category: 'IMAGING_STUDY' },
    'file',
    'fundus_retina_photo.jpg',
    dummyJpg,
    'image/jpeg'
  );
  console.log('JPEG upload status:', jpgRes.status, 'ID:', jpgRes.body?.data?.id);

  console.log('\n4. Testing Unsupported file format (.exe):');
  const exeRes = await uploadMultipart(
    '/api/v1/attachments',
    { patientProfileId, category: 'OTHER' },
    'file',
    'malware.exe',
    Buffer.from('MZ...executable binary'),
    'application/x-msdownload'
  );
  console.log('EXE upload status:', exeRes.status, JSON.stringify(exeRes.body));

  console.log('\n5. Testing missing patientProfileId:');
  const missingPatientRes = await uploadMultipart(
    '/api/v1/attachments',
    { category: 'CLINICAL_NOTE' },
    'file',
    'orphan_file.pdf',
    dummyPdf,
    'application/pdf'
  );
  console.log('Missing patientProfileId status:', missingPatientRes.status, JSON.stringify(missingPatientRes.body));
})();

