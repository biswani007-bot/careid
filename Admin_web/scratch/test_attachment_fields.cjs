const https = require('https');
const fs = require('fs');
const { getFreshToken } = require('./api_helper.cjs');

function uploadWithFields(token, fields, fileName, fileBuffer) {
  return new Promise((resolve) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.alloc(0);

    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== null) {
        const fieldHead = `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
        body = Buffer.concat([body, Buffer.from(fieldHead)]);
      }
    }

    const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/pdf\r\n\r\n`;
    body = Buffer.concat([body, Buffer.from(fileHead), fileBuffer, Buffer.from('\r\n')]);
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
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';
  const minPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n186\n%%EOF');

  // Test 1: Upload with extra fields (recordType, provider, facility, summary)
  console.log('--- Testing upload with extra fields ---');
  const resExtra = await uploadWithFields(
    token,
    {
      patientProfileId,
      category: 'LAB_RESULT',
      recordType: 'Full Blood Count',
      provider: 'Dr. Michael Chen',
      facility: 'Apex Diagnostic Lab',
      summary: 'Patient routine metabolic checkup'
    },
    'extra_fields_test.pdf',
    minPdf
  );
  console.log('Status with extra fields:', resExtra.status);
  console.log('Response data keys:', Object.keys(resExtra.body?.data || {}));
  console.log('Response body:', JSON.stringify(resExtra.body?.data, null, 2));

  // Check if those fields exist in the response
  const att = resExtra.body?.data;
  if (att) {
    console.log('recordType returned?:', att.recordType);
    console.log('provider returned?:', att.provider);
    console.log('facility returned?:', att.facility);
    console.log('summary returned?:', att.summary);
  }

  // Test 2: Check timeline item for this attachment
  console.log('\n--- Checking timeline for this attachment ---');
  const { apiGet } = require('./api_helper.cjs');
  const timeline = await apiGet(`/api/v1/admin/patients/${patientProfileId}/medical-records/timeline`);
  const found = timeline.body?.data?.find(x => x.id === att?.id);
  console.log('Found in patient timeline?:', Boolean(found));
  if (found) {
    console.log('Timeline item structure:', JSON.stringify(found, null, 2));
  }
})();
