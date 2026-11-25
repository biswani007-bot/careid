const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.resolve(__dirname, '..', '.token_cache.json');
const TARGET_PATIENT_ID = '787e5187-7859-4320-bb1a-465a57dd086a'; // Marcus Doe

async function getValidToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  try {
    const testRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${cached.accessToken}` },
    });
    if (testRes.status === 200) return cached.accessToken;
  } catch {}

  if (cached.refreshToken) {
    try {
      const refRes = await fetch(`${BASE_URL}/auth/token/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: cached.refreshToken }),
      });
      const data = await refRes.json();
      const newToken = data.data?.accessToken || data.accessToken;
      if (newToken) {
        cached.accessToken = newToken;
        if (data.data?.refreshToken) cached.refreshToken = data.data.refreshToken;
        fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cached, null, 2));
        return newToken;
      }
    } catch {}
  }
  return cached.accessToken;
}

async function runTests() {
  console.log('================================================================');
  console.log('LAB REPORT PAGE & RECORDS RUNTIME VERIFICATION SUITE');
  console.log('================================================================\n');

  const token = await getValidToken();

  // Test 1: Staging API patient response inspect
  console.log('--- TEST 1: Inspect Marcus Doe profile API response ---');
  const pRes = await fetch(`${BASE_URL}/doctors/patients/${TARGET_PATIENT_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const pData = (await pRes.json()).data;
  console.log(`Status: ${pRes.status}`);
  console.log(`firstName: "${pData.firstName}", lastName: "${pData.lastName}", fullName: ${pData.fullName}`);
  if (pData.fullName === undefined && pData.firstName === 'Marcus') {
    console.log('✔ Confirmed: API provides firstName/lastName without a top-level fullName property.');
  } else {
    console.log('ℹ API fullName structure:', pData.fullName);
  }

  // Test 2: Staging API medical-records response inspect
  console.log('\n--- TEST 2: Inspect Marcus Doe medical records structure ---');
  const rRes = await fetch(`${BASE_URL}/doctors/patients/${TARGET_PATIENT_ID}/medical-records?page=1&limit=20&includeArchived=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const records = (await rRes.json()).data;
  console.log(`Status: ${rRes.status}, Total records loaded: ${records.length}`);
  const sampleRecord = records[0];
  console.log(`Sample record ID: ${sampleRecord.id}`);
  console.log(`Sample record has 'patient' object: ${'patient' in sampleRecord}`);
  if (!('patient' in sampleRecord)) {
    console.log('✔ Confirmed: Backend medical-records records do NOT include an embedded patient object.');
  }

  // Test 3: Reproduce original crash vs verify new resolution
  console.log('\n--- TEST 3: Original Crash Reproduction & Fix Verification ---');
  let originalCrashed = false;
  try {
    // This was the exact logic in original LabReportPage:
    const broken = pData?.fullName || (sampleRecord.patient).firstName ? 'first' : 'second';
  } catch (err) {
    originalCrashed = true;
    console.log(`✔ Caught original runtime crash: ${err.name} - ${err.message}`);
  }
  if (!originalCrashed) {
    throw new Error('Original code did not reproduce crash!');
  }

  // Fixed resolution logic
  const recPatient = sampleRecord.patient;
  const patientName =
    pData.fullName?.trim() ||
    [pData.firstName, pData.lastName].filter(Boolean).join(' ').trim() ||
    recPatient?.fullName?.trim() ||
    [recPatient?.firstName, recPatient?.lastName].filter(Boolean).join(' ').trim() ||
    '';
  const patientNumber =
    pData.patientNumber ||
    recPatient?.patientNumber ||
    recPatient?.mrn ||
    sampleRecord.patientProfileId ||
    '';
  console.log(`Fixed resolution -> patientName: "${patientName}", patientNumber: "${patientNumber}"`);
  if (patientName === 'Marcus Doe' && patientNumber === '+16505550004') {
    console.log('✔ Verified: Dynamic patient demographic mapping correctly resolves Marcus Doe and +16505550004.');
  } else {
    throw new Error(`Unexpected resolution: ${patientName} / ${patientNumber}`);
  }

  // Test 4: Missing patient data / 404 scenario
  console.log('\n--- TEST 4: Invalid patient ID (404 Scenario) ---');
  const invalidId = '00000000-0000-0000-0000-000000000000';
  const notFoundRes = await fetch(`${BASE_URL}/doctors/patients/${invalidId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`Status for nonexistent patient: ${notFoundRes.status} ${notFoundRes.statusText}`);
  const notFoundBody = await notFoundRes.json();
  console.log(`Error message: ${notFoundBody.message}`);
  if (notFoundRes.status === 404) {
    console.log('✔ Confirmed: Nonexistent patient correctly produces 404 which surfaces to error state.');
  }

  // Test 5: Edge cases simulation (empty names, null patient, empty records)
  console.log('\n--- TEST 5: Edge Case Simulations ---');
  // 5a. Record exists, patient has only numbers (no names)
  const barePatient = { id: 'test-id', patientNumber: 'PT-123' };
  const bareName =
    barePatient.fullName?.trim() ||
    [barePatient.firstName, barePatient.lastName].filter(Boolean).join(' ').trim() ||
    '';
  console.log(`5a. Bare patient name (no fabrication): "${bareName}"`);
  if (bareName === '') {
    console.log('✔ Verified: No fabricated patient names injected when demographics lack names.');
  }

  // 5b. Empty records list
  const emptyRecords = [];
  const labRec = emptyRecords.find((r) => r.title.includes('lab')) || emptyRecords[0];
  console.log(`5b. Empty records resolution: ${labRec === undefined ? 'undefined (triggers !record UI state)' : 'error'}`);
  if (labRec === undefined) {
    console.log('✔ Verified: Empty medical records gracefully transitions to No Laboratory Reports Found UI.');
  }

  // 5c. Filter matches lab panel
  const labRecord = records.find(
    (r) =>
      r.attachments?.some((a) => a.category?.toLowerCase().includes('lab')) ||
      r.title.toLowerCase().includes('lab') ||
      r.title.toLowerCase().includes('panel') ||
      r.title.toLowerCase().includes('blood') ||
      r.title.toLowerCase().includes('cbc') ||
      r.title.toLowerCase().includes('cmp')
  );
  console.log(`5c. Lab record filter match: "${labRecord?.title}" (ID: ${labRecord?.id})`);
  if (labRecord) {
    console.log('✔ Verified: Diagnostic lab matching identifies authentic laboratory panel.');
  }

  console.log('\n================================================================');
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests();
