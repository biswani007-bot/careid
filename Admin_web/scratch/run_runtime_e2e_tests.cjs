const { getFreshToken, apiGet } = require('./api_helper.cjs');
const https = require('https');
const fs = require('fs');

function uploadMultipart(token, fields, fileName, filePath) {
  return new Promise((resolve) => {
    const fileBuffer = fs.readFileSync(filePath);
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
  console.log('--- STARTING RUNTIME API VERIFICATION ---');
  const token = await getFreshToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a'; // Karcus Doe (CID-249015)

  // 1. Upload Medical Attachment
  console.log('\n1. Uploading Medical Attachment (Comprehensive Metabolic Panel)...');
  const resMed = await uploadMultipart(
    token,
    { patientProfileId, category: 'LAB_RESULT' },
    'medical_blood_panel.pdf',
    'scratch/medical_blood_panel.pdf'
  );
  console.log('Medical Upload Status:', resMed.status);
  console.log('Medical Attachment ID:', resMed.body?.data?.id);
  console.log('Medical File Name:', resMed.body?.data?.fileName);

  // 2. Upload Dental Attachment
  console.log('\n2. Uploading Dental Attachment (Panoramic OPG X-Ray)...');
  const resDent = await uploadMultipart(
    token,
    { patientProfileId, category: 'IMAGING_STUDY' },
    'dental_panoramic_opg.pdf',
    'scratch/dental_panoramic_opg.pdf'
  );
  console.log('Dental Upload Status:', resDent.status);
  console.log('Dental Attachment ID:', resDent.body?.data?.id);
  console.log('Dental File Name:', resDent.body?.data?.fileName);

  // 3. Upload Vision Attachment
  console.log('\n3. Uploading Vision Attachment (Retinal Fundus Scan)...');
  const resVis = await uploadMultipart(
    token,
    { patientProfileId, category: 'IMAGING_STUDY' },
    'vision_fundus_retinal.pdf',
    'scratch/vision_fundus_retinal.pdf'
  );
  console.log('Vision Upload Status:', resVis.status);
  console.log('Vision Attachment ID:', resVis.body?.data?.id);
  console.log('Vision File Name:', resVis.body?.data?.fileName);

  // 4. Verify Timeline Retrieval
  console.log('\n4. Verifying Timeline Retrieval via GET /api/v1/admin/patients/:id/medical-records/timeline ...');
  const resTimeline = await apiGet(`/api/v1/admin/patients/${patientProfileId}/medical-records/timeline`);
  console.log('Timeline GET Status:', resTimeline.status);
  const items = resTimeline.body?.data || [];
  const attachmentsOnTimeline = items.filter(i => i.type === 'ATTACHMENT');
  const recordsOnTimeline = items.filter(i => i.type === 'MEDICAL_RECORD');
  console.log(`Timeline Total Items: ${items.length} | Clinical Records: ${recordsOnTimeline.length} | Attachments: ${attachmentsOnTimeline.length}`);

  // Check if our newly uploaded files appear on timeline
  const medFound = attachmentsOnTimeline.find(a => a.id === resMed.body?.data?.id);
  const dentFound = attachmentsOnTimeline.find(a => a.id === resDent.body?.data?.id);
  const visFound = attachmentsOnTimeline.find(a => a.id === resVis.body?.data?.id);
  console.log('Medical attachment indexed in timeline:', Boolean(medFound));
  console.log('Dental attachment indexed in timeline:', Boolean(dentFound));
  console.log('Vision attachment indexed in timeline:', Boolean(visFound));

  // 5. Verify File Download / Streaming via GET /api/v1/attachments/file/:filename
  console.log('\n5. Verifying File Streaming / Download ...');
  if (resVis.body?.data?.fileName) {
    const streamRes = await apiGet(`/api/v1/attachments/file/${encodeURIComponent(resVis.body.data.fileName)}`);
    console.log('Vision File Stream Status:', streamRes.status);
    console.log('Vision File Stream Content Length:', streamRes.body?.length);
  }

  // 6. Test Doctor Permission Restriction on Clinical Record Authoring
  console.log('\n6. Testing Admin vs Doctor Record Authoring Permissions ...');
  const { apiPost } = require('./api_helper.cjs');
  const adminPostRes = await apiPost('/api/v1/admin/medical-records', { title: 'Test Encounter' });
  console.log('Admin POST /api/v1/admin/medical-records:', adminPostRes.status, adminPostRes.body?.error || adminPostRes.body?.message);

  const docPostRes = await apiPost(`/api/v1/doctors/patients/${patientProfileId}/medical-records`, { title: 'Test Encounter' });
  console.log(`Admin POST /api/v1/doctors/patients/${patientProfileId}/medical-records:`, docPostRes.status, docPostRes.body?.error || docPostRes.body?.message);

  console.log('\n--- RUNTIME API VERIFICATION COMPLETE ---');
})();
