const fs = require('fs');
const https = require('https');

const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
const token = JSON.parse(fs.readFileSync('.token_cache.json', 'utf8')).accessToken;

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const APPOINTMENT_ID = 'cbc5b22e-e93f-4bf3-a5c5-82c4c098dbe7';
const PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a';
const DOCTOR_ID = '1f06067b-e229-4707-84e2-afa27da2e4cd';

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Function to find exact Postman items by URL regex or name
function findPostmanItems(pattern) {
  const matches = [];
  function recurse(items, path = '') {
    for (const it of items) {
      if (it.request) {
        const u = it.request.url.raw || '';
        if (pattern.test(u) || pattern.test(it.name)) {
          matches.push({ name: path + it.name, method: it.request.method, url: u, body: it.request.body });
        }
      }
      if (it.item) recurse(it.item, path + it.name + ' > ');
    }
  }
  recurse(col.item);
  return matches;
}

async function runAudit() {
  console.log('================================================================');
  console.log('CAREID DOCTOR WEB — STAGES 16–20 DETAILED FORENSIC GAP AUDIT');
  console.log('================================================================\n');

  // 1. SAFETY HOLD
  console.log('--- 1. SAFETY HOLD AUDIT ---');
  const holdPostman = findPostmanItems(/safety-hold/i);
  console.log('Postman definitions for safety-hold:');
  holdPostman.forEach((p) => console.log(`  [${p.method}] ${p.url} (${p.name})`));

  // Test GET active hold
  const activeHoldRes = await request('GET', `/cath-lab/safety-hold/active?appointmentId=${APPOINTMENT_ID}`);
  console.log(`GET /cath-lab/safety-hold/active: Status = ${activeHoldRes.status}`, JSON.stringify(activeHoldRes.data));

  // Test DELETE endpoint probe
  const deleteHoldProbe = await request('DELETE', `/cath-lab/safety-hold/${APPOINTMENT_ID}`);
  console.log(`Probe DELETE /cath-lab/safety-hold/:id: Status = ${deleteHoldProbe.status}`);

  // Test declare hold
  const declareHoldRes = await request('POST', '/cath-lab/safety-hold', {
    appointmentId: APPOINTMENT_ID,
    reasonCategory: 'EQUIPMENT_MALFUNCTION',
    reasonDescription: 'Audit test: temporary pressure transducer baseline drift',
  });
  console.log(`POST /cath-lab/safety-hold (declare): Status = ${declareHoldRes.status}`, JSON.stringify(declareHoldRes.data));

  let createdHoldId = declareHoldRes.data?.data?.id || declareHoldRes.data?.id;

  if (createdHoldId) {
    // Check active hold now
    const checkHoldAfter = await request('GET', `/cath-lab/safety-hold/active?appointmentId=${APPOINTMENT_ID}`);
    console.log(`GET active hold after declare: Status = ${checkHoldAfter.status}`, JSON.stringify(checkHoldAfter.data));

    // Clear hold
    const clearHoldRes = await request('POST', `/cath-lab/safety-hold/${createdHoldId}/clear`, {
      resolutionNotes: 'Audit test: Transducer recalibrated and zeroed. Cleared for procedure.',
    });
    console.log(`POST /cath-lab/safety-hold/:id/clear: Status = ${clearHoldRes.status}`, JSON.stringify(clearHoldRes.data));
  }

  // 2. CLINICAL ENCOUNTER
  console.log('\n--- 2. CLINICAL ENCOUNTER AUDIT ---');
  const encPostman = findPostmanItems(/\/encounters/i);
  console.log('Postman definitions with /encounters:');
  encPostman.forEach((p) => console.log(`  [${p.method}] ${p.url} (${p.name})`));

  // Probe GET /encounters/:id
  const testEncId = 'd2719715-7970-45b1-8de8-fb96865e0ae9';
  const getEncProbe1 = await request('GET', `/encounters/${testEncId}`);
  console.log(`Probe GET /encounters/:id: Status = ${getEncProbe1.status}`);

  // Probe GET /doctors/patients/:patientProfileId/encounters/:encounterId
  const getEncProbe2 = await request('GET', `/doctors/patients/${PATIENT_ID}/encounters/${testEncId}`);
  console.log(`Probe GET /doctors/patients/:patientProfileId/encounters/:encounterId: Status = ${getEncProbe2.status}`);

  // Probe GET /doctors/patients/:patientProfileId/medical-records
  const getDoctorRecs = await request('GET', `/doctors/patients/${PATIENT_ID}/medical-records?page=1&limit=5`);
  console.log(`GET /doctors/patients/:patientProfileId/medical-records: Status = ${getDoctorRecs.status}, Total = ${getDoctorRecs.data?.data?.total || getDoctorRecs.data?.data?.length || 0}`);

  // 3. PROCEDURE DOCUMENTATION & HEMODYNAMICS
  console.log('\n--- 3. PROCEDURE DOCUMENTATION, HEMODYNAMICS & TELEMETRY AUDIT ---');
  const procPostman = findPostmanItems(/procedures|hemodynamics|telemetry/i);
  console.log('Postman definitions for procedures / hemodynamics / telemetry:');
  procPostman.forEach((p) => console.log(`  [${p.method}] ${p.url} (${p.name})`));

  // Probe GET /encounters/:id/procedures
  const getProcsProbe = await request('GET', `/encounters/${testEncId}/procedures`);
  console.log(`Probe GET /encounters/:id/procedures: Status = ${getProcsProbe.status}`);

  // Probe GET /encounters/:id/hemodynamics
  const getHemoProbe = await request('GET', `/encounters/${testEncId}/hemodynamics`);
  console.log(`Probe GET /encounters/:id/hemodynamics: Status = ${getHemoProbe.status}`);

  // Probe PUT /encounters/:id/procedures or PUT /encounters/:id/hemodynamics
  const putHemoProbe = await request('PUT', `/encounters/${testEncId}/hemodynamics`, { systolicBp: 120 });
  console.log(`Probe PUT /encounters/:id/hemodynamics: Status = ${putHemoProbe.status}`);

  // Probe Telemetry History
  const telHistProbe = await request('GET', `/cath-lab/telemetry/history?appointmentId=${APPOINTMENT_ID}`);
  console.log(`Probe GET /cath-lab/telemetry/history: Status = ${telHistProbe.status}`);
  const telLogsProbe = await request('GET', `/cath-lab/telemetry/logs?appointmentId=${APPOINTMENT_ID}`);
  console.log(`Probe GET /cath-lab/telemetry/logs: Status = ${telLogsProbe.status}`);
  const telAllProbe = await request('GET', `/cath-lab/telemetry?appointmentId=${APPOINTMENT_ID}`);
  console.log(`Probe GET /cath-lab/telemetry: Status = ${telAllProbe.status}`);

  // 4. DICOM AUDIT
  console.log('\n--- 4. DICOM AUDIT ---');
  const dicomPostman = findPostmanItems(/dicom/i);
  console.log('Postman definitions for DICOM:');
  dicomPostman.forEach((p) => console.log(`  [${p.method}] ${p.url} (${p.name})`));

  // Check keyframe retrieval
  // First get listed series for encounter
  const getSeries = await request('GET', `/cath-lab/encounters/${testEncId}/dicom-series`);
  console.log(`GET /cath-lab/encounters/:encounterId/dicom-series: Status = ${getSeries.status}`);
  const seriesList = getSeries.data?.data || [];
  if (seriesList.length > 0) {
    const sId = seriesList[0].id;
    const kf = seriesList[0].keyFrameNumbers?.[0] || 1;
    const frameRes = await request('GET', `/cath-lab/dicom-series/${sId}/frames/${kf}`);
    console.log(`GET /cath-lab/dicom-series/:seriesId/frames/:frameNumber: Status = ${frameRes.status}`);
  }

  // Probe DICOM binary upload / download endpoints
  const dicomUploadProbe1 = await request('POST', `/cath-lab/encounters/${testEncId}/dicom-upload`);
  console.log(`Probe POST /cath-lab/encounters/:id/dicom-upload: Status = ${dicomUploadProbe1.status}`);

  // 5. POST-PROCEDURE SUMMARY & IMMUTABILITY AUDIT
  console.log('\n--- 5. POST-PROCEDURE SUMMARY & IMMUTABILITY AUDIT ---');
  // Attempt to update an already FINAL record:
  const testFinalRecId = 'd2719715-7970-45b1-8de8-fb96865e0ae9'; // marked FINAL in previous run
  const updateFinalProbe = await request('PUT', `/doctors/patients/${PATIENT_ID}/medical-records/${testFinalRecId}`, {
    clinicalNotes: 'Attempting illegal modification to sealed FINAL record',
  });
  console.log(`PUT on FINAL medical record: Status = ${updateFinalProbe.status}`, JSON.stringify(updateFinalProbe.data));

  // Test addenda endpoint for FINAL records
  const addendaPostman = findPostmanItems(/addenda/i);
  console.log('Postman definitions for addenda:');
  addendaPostman.forEach((p) => console.log(`  [${p.method}] ${p.url} (${p.name})`));

  // Probe POST addenda
  const addAddendumRes = await request('POST', `/medical-records/${testFinalRecId}/addenda`, {
    note: 'Audit test: Clinical addendum appended post-finalization. Patient hemodynamically stable.',
  });
  console.log(`POST /medical-records/:id/addenda: Status = ${addAddendumRes.status}`, JSON.stringify(addAddendumRes.data));

  // 6. ENCOUNTER COMPLETION & IDEMPOTENCY
  console.log('\n--- 6. ENCOUNTER COMPLETION & IDEMPOTENCY AUDIT ---');
  // Test repeat PUT /appointments/:id/status to COMPLETED
  const repeatComplete = await request('PUT', `/appointments/${APPOINTMENT_ID}/status`, {
    status: 'COMPLETED',
    notes: 'Idempotency check: Repeat completion call',
  });
  console.log(`Repeat PUT /appointments/:id/status (COMPLETED): Status = ${repeatComplete.status}`, JSON.stringify(repeatComplete.data));

  // 7. CLINICAL SAFETY & CHECKLIST VALIDATIONS
  console.log('\n--- 7. CLINICAL SAFETY & VALIDATIONS AUDIT ---');
  // Attempt to ratify safety time-out on a non-existent or blank payload
  const badTimeoutRes = await request('POST', '/cath-lab/safety-timeout', {
    appointmentId: '00000000-0000-0000-0000-000000000000',
  });
  console.log(`POST /cath-lab/safety-timeout with missing gates: Status = ${badTimeoutRes.status}`, JSON.stringify(badTimeoutRes.data));
}

runAudit().catch(console.error);

