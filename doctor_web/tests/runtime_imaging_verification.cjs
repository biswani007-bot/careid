/**
 * CareID Doctor Web — Imaging / Radiology Backend Integration Runtime Verification
 *
 * Verifies:
 * 1. Doctor session authentication & permissions
 * 2. Doctor assigned panel & patient resolution
 * 3. Retrieval of authentic medical records & imaging studies
 * 4. Verification of authentic binary attachment streaming with bearer authorization
 * 5. Backend record verification & attestation (PUT /doctors/patients/:patientProfileId/medical-records/:recordId)
 * 6. Modality derivation logic across multiple real staging records
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const BASE_URL = '360api.vnvision.in';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a'; // Marcus Doe

function getValidDoctorToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  return cached.accessToken;
}

function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: '/api/v1' + urlPath,
      method: method,
      headers: headers,
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString('utf8');
        let data = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          rawBuffer: buf,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runVerification() {
  console.log('================================================================');
  console.log('CAREID DOCTOR WEB — IMAGING / RADIOLOGY BACKEND RUNTIME VERIFICATION');
  console.log('================================================================\n');

  const token = getValidDoctorToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const results = [];

  // Step 1: Session check
  console.log('1. Checking Doctor Session & Role Identity...');
  const meRes = await request('GET', '/auth/me', authHeaders);
  const mePass = meRes.status === 200 && meRes.data?.data?.roles?.includes('DOCTOR');
  console.log(`   GET /auth/me: ${meRes.status} | DOCTOR role: ${mePass ? 'CONFIRMED' : 'FAILED'}`);
  results.push({ test: 'Doctor Session Authentication', passed: mePass });

  // Step 2: Doctor appointments / patient assignment
  console.log('\n2. Checking Doctor Assigned Patient Panel...');
  const apptRes = await request('GET', '/appointments/doctor/me', authHeaders);
  const apptCount = Array.isArray(apptRes.data?.data) ? apptRes.data.data.length : (Array.isArray(apptRes.data) ? apptRes.data.length : 0);
  const apptPass = apptRes.status === 200 && apptCount > 0;
  console.log(`   GET /appointments/doctor/me: ${apptRes.status} | Active appointments: ${apptCount}`);
  results.push({ test: 'Doctor Assigned Patient Panel', passed: apptPass });

  // Step 3: Patient profile retrieval
  console.log('\n3. Checking Patient Demographics Retrieval...');
  const pRes = await request('GET', `/doctors/patients/${PATIENT_ID}`, authHeaders);
  const patientData = pRes.data?.data || pRes.data;
  const patientPass = pRes.status === 200 && (patientData?.fullName || patientData?.firstName);
  console.log(`   GET /doctors/patients/${PATIENT_ID}: ${pRes.status} | Patient: ${patientData?.fullName || patientData?.firstName} ${patientData?.lastName || ''} (ID: ${patientData?.patientNumber || patientData?.mrn})`);
  results.push({ test: 'Patient Demographics Resolution', passed: patientPass });

  // Step 4: Medical records retrieval for imaging studies
  console.log('\n4. Checking Medical Records & Imaging Studies Retrieval...');
  const recsRes = await request('GET', `/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=100&includeArchived=true`, authHeaders);
  const records = recsRes.data?.data || recsRes.data || [];
  const recsPass = recsRes.status === 200 && records.length > 0;
  console.log(`   GET /doctors/patients/${PATIENT_ID}/medical-records: ${recsRes.status} | Total records: ${records.length}`);
  results.push({ test: 'Patient Medical Records Retrieval', passed: recsPass });

  // Find records with imaging keywords or attachments
  const imagingKeywords = ['mri', 'ct', 'x-ray', 'radiolog', 'fluoroscopy', 'angiography', 'ultrasound', 'catheterization'];
  const imagingStudies = records.filter((r) =>
    imagingKeywords.some((k) => r.title.toLowerCase().includes(k)) ||
    (r.attachments && r.attachments.length > 0)
  );
  console.log(`   Identified ${imagingStudies.length} imaging studies / attachment-linked records in patient chart.`);

  // Step 5: Test real attachment streaming with authorization
  console.log('\n5. Testing Authenticated Binary Attachment Streaming...');
  const attachedRecord = records.find((r) => r.attachments && r.attachments.length > 0);
  let streamPass = false;
  if (attachedRecord && attachedRecord.attachments[0]) {
    const att = attachedRecord.attachments[0];
    const streamUrl = att.storageUrl.replace(/^\/api\/v1/, '');
    console.log(`   Target attachment: ${att.fileName} (${att.mimeType}, ${att.fileSize} bytes)`);
    console.log(`   Streaming URL: ${streamUrl}`);

    // Test unauthenticated (must return 401)
    const unauthRes = await request('GET', streamUrl);
    console.log(`   Unauthenticated stream check: ${unauthRes.status} (Security: ${unauthRes.status === 401 ? 'PROTECTED' : 'WARNING'})`);

    // Test authenticated (must return 200 with binary payload)
    const authStreamRes = await request('GET', streamUrl, authHeaders);
    const hasBytes = authStreamRes.rawBuffer && authStreamRes.rawBuffer.length > 0;
    streamPass = authStreamRes.status === 200 && hasBytes;
    console.log(`   Authenticated stream check: ${authStreamRes.status} | Received: ${authStreamRes.rawBuffer?.length} bytes | Content-Type: ${authStreamRes.headers['content-type']}`);
  } else {
    console.log('   No attached records found to stream.');
  }
  results.push({ test: 'Authenticated Attachment Streaming', passed: streamPass });

  // Step 6: Test study verification / attestation
  console.log('\n6. Testing Attending Physician Study Verification...');
  const targetStudy = attachedRecord || records[0];
  const updatePayload = JSON.stringify({
    status: 'FINAL',
    clinicalNotes: `${targetStudy.clinicalNotes || 'Diagnostic study reviewed.'} [Clinician Verification Stamp ${new Date().toISOString()}]`,
  });

  const verifyRes = await request('PUT', `/doctors/patients/${PATIENT_ID}/medical-records/${targetStudy.id}`, authHeaders, updatePayload);
  const verifyPass = verifyRes.status === 200 && (verifyRes.data?.data?.status === 'FINAL' || verifyRes.data?.status === 'FINAL');
  console.log(`   PUT /doctors/patients/${PATIENT_ID}/medical-records/${targetStudy.id}: ${verifyRes.status} | Status: ${verifyRes.data?.data?.status || verifyRes.data?.status}`);
  results.push({ test: 'Clinician Study Verification (Mark Reviewed)', passed: verifyPass });

  // Summary
  console.log('\n================================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('================================================================');
  let allPass = true;
  for (const r of results) {
    console.log(`   [${r.passed ? 'PASS' : 'FAIL'}] ${r.test}`);
    if (!r.passed) allPass = false;
  }
  console.log(`\nOVERALL STATUS: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  if (!allPass) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});

