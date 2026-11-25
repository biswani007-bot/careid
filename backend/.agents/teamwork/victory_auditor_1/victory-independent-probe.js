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

async function runVictoryAudit() {
  console.log('=====================================================');
  console.log('  CAREID VICTORY AUDITOR INDEPENDENT LIVE PROBE');
  console.log('=====================================================');

  const probeResults = {};

  // 1. Doctor OTP Request
  console.log('\n[Probe 1] POST /api/v1/auth/otp/request (+16505550003)...');
  const otpReq = await request('https://360api.vnvision.in/api/v1/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003' });
  console.log('Status:', otpReq.statusCode, 'Body:', JSON.stringify(otpReq.body));
  probeResults.otpRequest = { status: otpReq.statusCode, body: otpReq.body };

  const challengeId = otpReq.body?.data?.challengeId;
  if (!challengeId) throw new Error('No challengeId returned from OTP request');

  // 2. Doctor OTP Verification
  console.log('\n[Probe 2] POST /api/v1/auth/otp/verify (123456)...');
  const otpVerify = await request('https://360api.vnvision.in/api/v1/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003', otpCode: '123456', challengeId });
  console.log('Status:', otpVerify.statusCode, 'Body:', JSON.stringify(otpVerify.body));
  probeResults.otpVerify = { status: otpVerify.statusCode };

  const token = otpVerify.body?.data?.accessToken;
  if (!token) throw new Error('No accessToken returned from OTP verification');
  const authHeader = { 'Authorization': `Bearer ${token}` };

  // 3. User Identity & Roles Check
  console.log('\n[Probe 3] GET /api/v1/auth/me...');
  const me = await request('https://360api.vnvision.in/api/v1/auth/me', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Status:', me.statusCode, 'Body:', JSON.stringify(me.body));
  probeResults.authMe = { status: me.statusCode, roles: me.body?.data?.roles, userId: me.body?.data?.id };

  // 4. Doctor Profile & Verification Status
  console.log('\n[Probe 4] GET /api/v1/doctors/me...');
  const docMe = await request('https://360api.vnvision.in/api/v1/doctors/me', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Status:', docMe.statusCode, 'Body:', JSON.stringify(docMe.body));
  probeResults.docMe = {
    status: docMe.statusCode,
    doctorProfileId: docMe.body?.data?.id,
    verificationStatus: docMe.body?.data?.verificationStatus
  };

  // 5. GET /api/v1/doctors/patients (Database Error 500 vs 403)
  console.log('\n[Probe 5] GET /api/v1/doctors/patients...');
  const docPatients = await request('https://360api.vnvision.in/api/v1/doctors/patients', {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Status:', docPatients.statusCode, 'Body:', JSON.stringify(docPatients.body));
  probeResults.docPatients = {
    status: docPatients.statusCode,
    error: docPatients.body?.error,
    message: docPatients.body?.message
  };

  // 6. Non-existent route check (/records/upload vs /attachments)
  console.log('\n[Probe 6] POST /api/v1/records/upload (Testing route existence)...');
  const fakeUpload = await request('https://360api.vnvision.in/api/v1/records/upload', {
    method: 'POST',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Status (/records/upload):', fakeUpload.statusCode, 'Body:', JSON.stringify(fakeUpload.body));
  probeResults.fakeUploadRoute = { status: fakeUpload.statusCode };

  // 7. Individual Patient Clinical Lookup
  const testPatientId = '787e5187-7859-4320-bb1a-465a57dd086a';
  console.log(`\n[Probe 7] GET /api/v1/doctors/patients/${testPatientId}...`);
  const patientLookup = await request(`https://360api.vnvision.in/api/v1/doctors/patients/${testPatientId}`, {
    method: 'GET',
    headers: { ...authHeader, 'Accept': 'application/json' }
  });
  console.log('Status:', patientLookup.statusCode, 'Body:', JSON.stringify(patientLookup.body));
  probeResults.patientLookup = {
    status: patientLookup.statusCode,
    patientName: patientLookup.body?.data?.fullName,
    authSource: patientLookup.body?.data?.authSource
  };

  // 8. Real Binary File Upload to POST /api/v1/attachments
  console.log('\n[Probe 8] POST /api/v1/attachments with multipart PDF...');
  const samplePdfContent = '%PDF-1.4\n%CareID Independent Victory Audit Binary Verification\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
  const pdfBuffer = Buffer.from(samplePdfContent);
  const boundary = '----VictoryAuditor' + Date.now().toString(16);
  const crlf = '\r\n';

  const pre = Buffer.from(
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="patientProfileId"' + crlf + crlf +
    testPatientId + crlf +
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="category"' + crlf + crlf +
    'LAB_REPORT' + crlf +
    '--' + boundary + crlf +
    'Content-Disposition: form-data; name="file"; filename="victory_audit_proof.pdf"' + crlf +
    'Content-Type: application/pdf' + crlf + crlf
  );
  const post = Buffer.from(crlf + '--' + boundary + '--' + crlf);
  const multipartBody = Buffer.concat([pre, pdfBuffer, post]);

  const uploadRes = await request('https://360api.vnvision.in/api/v1/attachments', {
    method: 'POST',
    headers: {
      ...authHeader,
      'Accept': 'application/json',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartBody.length
    }
  }, multipartBody);
  console.log('Status:', uploadRes.statusCode, 'Body:', JSON.stringify(uploadRes.body));
  const attachmentId = uploadRes.body?.data?.id;
  probeResults.attachmentUpload = {
    status: uploadRes.statusCode,
    attachmentId: attachmentId,
    mimeType: uploadRes.body?.data?.mimeType,
    fileSize: uploadRes.body?.data?.fileSize
  };

  // 9. OCR Job Contract Verification (Rejection of attachmentId vs Acceptance of medicalAttachmentId)
  if (attachmentId) {
    console.log('\n[Probe 9A] Testing POST /api/v1/ocr/jobs with invalid property "attachmentId"...');
    const badOcrJob = await request('https://360api.vnvision.in/api/v1/ocr/jobs', {
      method: 'POST',
      headers: {
        ...authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, {
      attachmentId: attachmentId,
      documentType: 'LAB_REPORT'
    });
    console.log('Bad Payload Status:', badOcrJob.statusCode, 'Body:', JSON.stringify(badOcrJob.body));
    probeResults.ocrBadContract = { status: badOcrJob.statusCode, body: badOcrJob.body };

    console.log('\n[Probe 9B] Testing POST /api/v1/ocr/jobs with valid "medicalAttachmentId"...');
    const goodOcrJob = await request('https://360api.vnvision.in/api/v1/ocr/jobs', {
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
    console.log('Good Payload Status:', goodOcrJob.statusCode, 'Body:', JSON.stringify(goodOcrJob.body));
    probeResults.ocrGoodContract = { status: goodOcrJob.statusCode, body: goodOcrJob.body };

    // 10. Check OCR Job Persistence in DB
    console.log('\n[Probe 10] Checking GET /api/v1/ocr/jobs?page=1&limit=5...');
    const listOcrJobs = await request('https://360api.vnvision.in/api/v1/ocr/jobs?page=1&limit=5', {
      method: 'GET',
      headers: { ...authHeader, 'Accept': 'application/json' }
    });
    console.log('OCR Jobs List Status:', listOcrJobs.statusCode, 'Count:', listOcrJobs.body?.data?.length || 0);
    const latestJob = listOcrJobs.body?.data?.[0];
    if (latestJob) {
      console.log('Latest Job Details:', JSON.stringify({
        id: latestJob.id,
        medicalAttachmentId: latestJob.medicalAttachmentId,
        status: latestJob.status,
        failureReason: latestJob.failureReason
      }));
      probeResults.persistedOcrJob = {
        id: latestJob.id,
        status: latestJob.status,
        failureReason: latestJob.failureReason
      };
    }
  }

  // 11. Clinical Record Persistence
  console.log(`\n[Probe 11] POST /api/v1/doctors/patients/${testPatientId}/medical-records...`);
  const recordSave = await request(`https://360api.vnvision.in/api/v1/doctors/patients/${testPatientId}/medical-records`, {
    method: 'POST',
    headers: {
      ...authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }, {
    title: 'Victory Auditor Independent Verification Record',
    chiefComplaint: 'Post-victory audit independent clinical verification',
    clinicalNotes: 'Verified independently by Victory Auditor under strict audit protocol',
    status: 'FINAL',
    encounter: {
      providerName: 'Dr. Sarah Jenkins, MD',
      facilityName: 'CareID Verification Facility',
      encounterType: 'OUTPATIENT',
      encounterDate: new Date().toISOString()
    },
    diagnoses: [
      {
        description: 'Independent Verification Clinical Exam',
        code: 'Z00.00',
        type: 'PRIMARY',
        status: 'CONFIRMED'
      }
    ],
    vitalSigns: {
      heightCm: 175,
      weightKg: 70,
      systolicBp: 118,
      diastolicBp: 78,
      pulseBpm: 70,
      temperatureC: 36.6
    }
  });
  console.log('Medical Record Save Status:', recordSave.statusCode, 'Body:', JSON.stringify(recordSave.body));
  probeResults.medicalRecordSave = {
    status: recordSave.statusCode,
    recordId: recordSave.body?.data?.id
  };

  console.log('\n=====================================================');
  console.log('  PROBE COMPLETE — SUMMARY MATRIX:');
  console.log(JSON.stringify(probeResults, null, 2));
  console.log('=====================================================');
}

runVictoryAudit().catch(err => {
  console.error('VICTORY AUDIT PROBE FAILED WITH UNHANDLED ERROR:', err);
  process.exit(1);
});
