const https = require('https');
const fs = require('fs');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch (_) { json = body; }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (data) {
      if (Buffer.isBuffer(data)) {
        req.write(data);
      } else {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function runAudit() {
  console.log('=== STARTING INDEPENDENT FORENSIC LIVE PROBE ===');
  
  // 1. Authenticate Doctor (Dr. Sarah Jenkins +16505550003)
  console.log('\n[1] Requesting OTP for +16505550003...');
  const otpReqRes = await request('https://360api.vnvision.in/api/v1/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003' });
  console.log('OTP Request Status:', otpReqRes.statusCode, JSON.stringify(otpReqRes.body));
  
  const challengeId = otpReqRes.body?.data?.challengeId;
  if (!challengeId) {
    throw new Error('Failed to obtain challengeId');
  }

  console.log('\n[2] Verifying OTP with 123456...');
  const otpVerifyRes = await request('https://360api.vnvision.in/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003', otpCode: '123456', challengeId });
  console.log('OTP Verify Status:', otpVerifyRes.statusCode);
  const token = otpVerifyRes.body?.data?.accessToken;
  console.log('Token acquired:', token ? `${token.substring(0, 20)}...` : 'NONE');

  const authHeader = { 'Authorization': `Bearer ${token}` };

  // 2. Auth me check
  console.log('\n[3] Calling GET /api/v1/auth/me...');
  const meRes = await request('https://360api.vnvision.in/api/v1/auth/me', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Auth me Status:', meRes.statusCode, JSON.stringify(meRes.body));

  // 3. Doctor profile check
  console.log('\n[4] Calling GET /api/v1/doctors/me...');
  const docMeRes = await request('https://360api.vnvision.in/api/v1/doctors/me', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Doctor me Status:', docMeRes.statusCode, JSON.stringify(docMeRes.body));

  // 4. Test GET /api/v1/doctors/patients (Database Error 500 vs 403)
  console.log('\n[5] Calling GET /api/v1/doctors/patients...');
  const patientsRes = await request('https://360api.vnvision.in/api/v1/doctors/patients', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Patients List Status:', patientsRes.statusCode, JSON.stringify(patientsRes.body));

  // 5. Test Authorized patient lookup
  console.log('\n[6] Calling GET /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a...');
  const patLookupRes = await request('https://360api.vnvision.in/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Patient Lookup Status:', patLookupRes.statusCode, JSON.stringify(patLookupRes.body));

  // 6. Test Attachment Upload
  console.log('\n[7] Testing POST /api/v1/attachments with sample binary PDF...');
  const samplePdfPath = 'C:/Users/PABANI/Downloads/sample.pdf';
  let sampleBuffer;
  if (fs.existsSync(samplePdfPath)) {
    sampleBuffer = fs.readFileSync(samplePdfPath);
  } else {
    // Generate minimal valid PDF buffer
    sampleBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
  }

  const boundary = '----AuditorBoundary' + Math.random().toString(16).substring(2);
  const crlf = '\r\n';
  const pre = Buffer.from(
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="patientProfileId"' + crlf + crlf +
    '787e5187-7859-4320-bb1a-465a57dd086a' + crlf +
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="category"' + crlf + crlf +
    'LAB_REPORT' + crlf +
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="file"; filename="sample_audit.pdf"' + crlf +
    'Content-Type: application/pdf' + crlf + crlf
  );
  const post = Buffer.from(crlf + '--' + boundary + '--' + crlf);
  const multipartBody = Buffer.concat([pre, sampleBuffer, post]);

  const uploadRes = await request('https://360api.vnvision.in/api/v1/attachments', {
    method: 'POST',
    headers: {
      ...authHeader,
      'Accept': 'application/json',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartBody.length
    }
  }, multipartBody);
  console.log('Upload Status:', uploadRes.statusCode, JSON.stringify(uploadRes.body));
  const attachmentId = uploadRes.body?.data?.id;

  // 7. Test OCR Job Creation
  if (attachmentId) {
    console.log('\n[8] Testing POST /api/v1/ocr/jobs with medicalAttachmentId:', attachmentId);
    const ocrJobRes = await request('https://360api.vnvision.in/api/v1/ocr/jobs', {
      method: 'POST',
      headers: {
        ...authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, {
      medicalAttachmentId: attachmentId,
      documentType: 'LAB_REPORT'
    });
    console.log('OCR Job Creation Status:', ocrJobRes.statusCode, JSON.stringify(ocrJobRes.body));

    // Check OCR jobs list
    console.log('\n[9] Checking GET /api/v1/ocr/jobs?page=1&limit=1...');
    const listJobRes = await request('https://360api.vnvision.in/api/v1/ocr/jobs?page=1&limit=1', {
      method: 'GET',
      headers: { ...authHeader, 'Accept': 'application/json' }
    });
    console.log('OCR Jobs List Status:', listJobRes.statusCode, JSON.stringify(listJobRes.body));
  }

  // 8. Test Medical Record creation
  console.log('\n[10] Testing POST /api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records...');
  const recordSaveRes = await request('https://360api.vnvision.in/api/v1/doctors/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records', {
    method: 'POST',
    headers: {
      ...authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }, {
    title: 'Audit Verification Medical Record',
    chiefComplaint: 'Routine clinical verification follow-up',
    clinicalNotes: 'Forensic integrity audit test record verified by auditor_1',
    status: 'FINAL',
    encounter: {
      providerName: 'Dr. Sarah Jenkins, MD',
      facilityName: 'General Hospital',
      encounterType: 'OUTPATIENT',
      encounterDate: new Date().toISOString()
    },
    diagnoses: [
      {
        description: 'Forensic Audit Verification Exam',
        code: 'Z00.00',
        type: 'PRIMARY',
        status: 'CONFIRMED'
      }
    ],
    vitalSigns: {
      systolicBp: 120,
      diastolicBp: 80,
      pulseBpm: 72,
      temperatureC: 36.8
    }
  });
  console.log('Medical Record Save Status:', recordSaveRes.statusCode, JSON.stringify(recordSaveRes.body));
  
  console.log('\n=== AUDIT LIVE PROBE COMPLETED ===');
}

runAudit().catch(err => {
  console.error('Audit Probe Error:', err);
  process.exit(1);
});
