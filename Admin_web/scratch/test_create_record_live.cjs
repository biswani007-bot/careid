const fs = require('fs');
const https = require('https');

let cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const defaultHeaders = {
      Authorization: `Bearer ${cached.accessToken}`,
      Accept: 'application/json',
      ...headers,
    };
    if (body && !defaultHeaders['Content-Type'] && typeof body === 'string') {
      defaultHeaders['Content-Type'] = 'application/json';
      defaultHeaders['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: defaultHeaders,
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(b) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: b });
        }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const patientProfileId = '06584c77-0109-4774-906e-f14a16db8470'; // Lucas Vance

  console.log('\n--- Testing 5: POST /api/v1/doctors/patients/:patientProfileId/medical-records ---');
  const postDocMed = await makeRequest(
    'POST',
    `/api/v1/doctors/patients/${patientProfileId}/medical-records`,
    JSON.stringify({
      title: 'Full Panoramic OPG X-Ray',
      chiefComplaint: 'Routine dental imaging',
      clinicalNotes: 'High-resolution digital orthopantomogram evaluating mandibular and maxillary bone density.',
      treatmentPlan: 'No acute intervention required. Follow up in 6 months.',
      followUpInstructions: 'Follow up in 6 months',
      status: 'FINAL'
    })
  );
  console.log('Status:', postDocMed.status);
  console.log('Body:', JSON.stringify(postDocMed.body));

  console.log('\n--- Testing 6: POST /api/v1/admin/patients/:patientProfileId/medical-records ---');
  const postAdminMed = await makeRequest(
    'POST',
    `/api/v1/admin/patients/${patientProfileId}/medical-records`,
    JSON.stringify({
      title: 'Full Panoramic OPG X-Ray',
      chiefComplaint: 'Routine dental imaging',
      clinicalNotes: 'Evaluation notes',
      status: 'FINAL'
    })
  );
  console.log('Status:', postAdminMed.status);
  console.log('Body:', JSON.stringify(postAdminMed.body));

  console.log('\n--- Testing 7: POST /api/v1/attachments ---');
  // How does /api/v1/attachments work? Multipart form-data or JSON?
  const postAtt = await makeRequest(
    'POST',
    '/api/v1/attachments',
    JSON.stringify({
      patientProfileId,
      fileName: 'test_xray.png',
      fileSize: 1024,
      mimeType: 'image/png',
      category: 'DENTAL'
    })
  );
  console.log('POST /attachments (JSON) status:', postAtt.status);
  console.log('POST /attachments body:', JSON.stringify(postAtt.body));
})();

