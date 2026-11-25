/**
 * CAREID BATCH 3 — SECURITY & SPECIES ISOLATION TEST SUITE
 * 
 * Verifies all 15 boundary and security scenarios for CAREID-DOCTOR-WEB-BATCH-03-REVISED:
 * 1. Human doctor token → GET /api/v1/pets → 403
 * 2. Human doctor token → GET /api/v1/doctors/pets → 403
 * 3. Human doctor token → POST /api/v1/doctors/pets/:id/vaccinations → 403
 * 4. Human doctor token → GET /api/v1/doctors/pets/:id/vaccinations → 403
 * 5. Human doctor token → GET /api/v1/doctors/pets/:id/timeline → 403
 * 6. Veterinarian token → GET /api/v1/doctors/patients → 403
 * 7. Veterinarian token → GET /api/v1/doctors/patients/:id/medical-records → 403
 * 8. Veterinarian token → POST /api/v1/doctors/patients/:id/prescriptions → 403
 * 9. Unrelated vet → another vet's pet records/vaccinations → 403
 * 10. QR verification: nonexistent token → 200 { isValid: false, status: 'INVALID' }
 * 11. QR verification: missing token field → 400
 * 12. Unauthenticated calls to clinical endpoints → 401
 * 13. Batch 1 regression: Human doctor patient list → 200
 * 14. Batch 2 regression: Prescription detail & PDF export endpoints operational (no 500)
 * 15. Architectural verification: QRScannerModal.tsx deleted, no references in Doctor Web
 * 
 * Target: http://localhost:3001
 * DB: localhost:5433 / careid_integration_db
 */

'use strict';

const http = require('http');
const fs = require('fs');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:3001';
const PG_CONFIG = {
  host: 'localhost',
  port: 5433,
  database: 'careid_integration_db',
  user: 'careid_test_user',
  password: '684d2f2cc7f34c932c20816e945bddd4',
  connectionTimeoutMillis: 5000,
};

// ─── HTTP helper ────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Auth helper ────────────────────────────────────────────────────────────

async function loginAs(phone) {
  // Step 1: Request OTP
  const reqRes = await request('POST', '/api/v1/auth/otp/request', { phone });
  const challengeId = reqRes.body?.data?.challengeId;
  // Step 2: Retrieve OTP from local test inbox
  const inboxRes = await request('GET', `/api/v1/test-support/sms-inbox/latest?phone=${encodeURIComponent(phone)}`);
  const otpCode = inboxRes.body?.data?.otpCode;
  if (!challengeId || !otpCode) {
    throw new Error(`Failed to get OTP for ${phone}: challengeId=${challengeId}, otpCode=${otpCode}`);
  }
  // Step 3: Verify OTP
  const verifyRes = await request('POST', '/api/v1/auth/otp/verify', {
    challengeId,
    otpCode,
    phone,
  });
  const token = verifyRes.body?.data?.accessToken || verifyRes.body?.accessToken;
  if (!token) throw new Error(`No access token returned for ${phone}`);
  return token;
}

// ─── Test reporter ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
    results.push({ name, status: 'PASS', detail });
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
    results.push({ name, status: 'FAIL', detail });
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

// ─── Main test execution ────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CAREID BATCH 3 — SECURITY & SPECIES ISOLATION TEST SUITE          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  DB:     localhost:5433/${PG_CONFIG.database}`);
  console.log(`  Time:   ${new Date().toISOString()}\n`);

  // Connect to PostgreSQL
  const pgClient = new Client(PG_CONFIG);
  await pgClient.connect();
  console.log('  ✅ PostgreSQL connected successfully');

  // Discover verified entity IDs from DB
  const petRows = await pgClient.query(`
    SELECT p.id, p.name, p.species, pcr.doctor_id as treating_doctor_id
    FROM pets p
    JOIN pet_clinical_records pcr ON pcr.pet_id = p.id
    LIMIT 1
  `);
  const petId = petRows.rows[0]?.id || '4947c8b6-5d30-4204-aa2e-ec60a62f83ad';

  const patientRows = await pgClient.query(`
    SELECT id, first_name, last_name FROM patient_profiles LIMIT 1
  `);
  const humanPatientId = patientRows.rows[0]?.id || '3896bc97-bd3b-40ae-80c1-0cc0455ca3a4';

  console.log(`  ℹ Verified Pet ID:          ${petId} (${petRows.rows[0]?.name || 'Barnaby'})`);
  console.log(`  ℹ Verified Human Patient ID: ${humanPatientId} (${patientRows.rows[0]?.first_name || 'John'} ${patientRows.rows[0]?.last_name || 'Doe'})`);

  // ── Acquire Tokens ────────────────────────────────────────────────────────
  section('TOKEN ACQUISITION');

  const humanDoctorToken = await loginAs('+16505550003');
  assert('Human doctor token acquired (Dr. Sarah Jenkins, Cardiology)', !!humanDoctorToken);

  const treatingVetToken = await loginAs('+16505555165');
  assert('Treating veterinarian token acquired (+16505555165, Veterinary Medicine)', !!treatingVetToken);

  const unrelatedVetToken = await loginAs('+16505555120');
  assert('Unrelated veterinarian token acquired (+16505555120, Veterinary Medicine)', !!unrelatedVetToken);

  // ── SECTION 1: Human Doctor → Pet Endpoints (must 403) ───────────────────
  section('SECTION 1 — Human Doctor Blocked from Veterinary Clinical Endpoints');

  const r1 = await request('GET', '/api/v1/pets', null, humanDoctorToken);
  assert('SEC-01: Human doctor → GET /api/v1/pets → 403', r1.status === 403, `Got ${r1.status}`);

  const r2 = await request('GET', '/api/v1/doctors/pets', null, humanDoctorToken);
  assert('SEC-02: Human doctor → GET /api/v1/doctors/pets → 403', r2.status === 403, `Got ${r2.status}`);

  const r3 = await request(
    'POST',
    `/api/v1/doctors/pets/${petId}/vaccinations`,
    { vaccineName: 'Rabies Booster', administeredDate: '2026-11-20' },
    humanDoctorToken
  );
  assert('SEC-03: Human doctor → POST /doctors/pets/:id/vaccinations → 403', r3.status === 403, `Got ${r3.status}`);

  const r3b = await request('GET', `/api/v1/doctors/pets/${petId}/vaccinations`, null, humanDoctorToken);
  assert('SEC-03b: Human doctor → GET /doctors/pets/:id/vaccinations → 403', r3b.status === 403, `Got ${r3b.status}`);

  const r3c = await request('GET', `/api/v1/doctors/pets/${petId}/timeline`, null, humanDoctorToken);
  assert('SEC-03c: Human doctor → GET /doctors/pets/:id/timeline → 403', r3c.status === 403, `Got ${r3c.status}`);

  // ── SECTION 2: Veterinarian → Human Endpoints (must 403) ─────────────────
  section('SECTION 2 — Veterinarian Blocked from Human Clinical Endpoints');

  const r4 = await request('GET', '/api/v1/doctors/patients', null, treatingVetToken);
  assert('SEC-04: Veterinarian → GET /api/v1/doctors/patients → 403', r4.status === 403, `Got ${r4.status}`);

  const r5 = await request('GET', `/api/v1/doctors/patients/${humanPatientId}/medical-records`, null, treatingVetToken);
  assert('SEC-05: Veterinarian → GET /doctors/patients/:id/medical-records → 403', r5.status === 403, `Got ${r5.status}`);

  const r6 = await request(
    'POST',
    `/api/v1/doctors/patients/${humanPatientId}/prescriptions`,
    {
      diagnosisCode: 'I25.10 - Test Diagnosis',
      notes: 'Prescription creation attempt by veterinarian',
      status: 'ACTIVE',
      items: [
        {
          drugName: 'Amoxicillin',
          dosage: '500 mg',
          form: 'Oral Capsule',
          route: 'ORAL',
          frequency: 'TID',
          durationDays: 7,
          instructions: 'Take 1 capsule three times daily',
        },
      ],
    },
    treatingVetToken
  );
  assert('SEC-06: Veterinarian → POST /doctors/patients/:id/prescriptions → 403', r6.status === 403, `Got ${r6.status}`);

  // ── SECTION 3: Cross-Vet Unauthorized Pet Access (must 403) ──────────────
  section('SECTION 3 — Cross-Vet Unauthorized Companion Access (Unrelated Vet)');

  const r9 = await request(
    'POST',
    `/api/v1/doctors/pets/${petId}/vaccinations`,
    { vaccineName: 'Unauthorized Vet Vaccine', administeredDate: '2026-11-20' },
    unrelatedVetToken
  );
  assert(
    'SEC-09a: Unrelated vet without care relationship → POST vaccinations → 403',
    r9.status === 403,
    `Got ${r9.status}`
  );

  const r9b = await request('GET', `/api/v1/doctors/pets/${petId}/vaccinations`, null, unrelatedVetToken);
  assert(
    'SEC-09b: Unrelated vet without care relationship → GET vaccinations → 403',
    r9b.status === 403,
    `Got ${r9b.status}`
  );

  const r9c = await request('GET', `/api/v1/doctors/pets/${petId}/timeline`, null, unrelatedVetToken);
  assert(
    'SEC-09c: Unrelated vet without care relationship → GET timeline → 403',
    r9c.status === 403,
    `Got ${r9c.status}`
  );

  // ── SECTION 4: Treating Veterinarian Positive Vault Tests ────────────────
  section('SECTION 4 — Treating Veterinarian Positive Vault Workflows');

  const rVetPets = await request('GET', '/api/v1/doctors/pets', null, treatingVetToken);
  assert(
    'VET-01: Treating vet → GET /api/v1/doctors/pets → 200',
    rVetPets.status === 200,
    `Got ${rVetPets.status}`
  );

  const testBatchNum = `RB-AUTO-${Date.now().toString().slice(-6)}`;
  const rVacPost = await request(
    'POST',
    `/api/v1/doctors/pets/${petId}/vaccinations`,
    {
      vaccineName: 'DHPP Core Vaccine',
      administeredDate: '2026-11-20',
      batchNumber: testBatchNum,
      notes: 'Automated Batch 3 E2E test vaccination',
    },
    treatingVetToken
  );
  const vacBody = rVacPost.body?.data || rVacPost.body;
  assert(
    'VET-02: Treating vet → POST vaccinations → 201 Created',
    rVacPost.status === 201 && vacBody?.id,
    `Got ${rVacPost.status}, vaccine ID: ${vacBody?.id}`
  );

  // Verify PostgreSQL persistence
  const dbCheck = await pgClient.query(
    'SELECT id, vaccine_name, batch_number, veterinarian FROM pet_vaccinations WHERE batch_number = $1',
    [testBatchNum]
  );
  assert(
    'VET-02b: Vaccination record persisted in PostgreSQL pet_vaccinations',
    dbCheck.rows.length === 1 && dbCheck.rows[0].batch_number === testBatchNum,
    `Found rows: ${dbCheck.rows.length}`
  );

  const rVacGet = await request('GET', `/api/v1/doctors/pets/${petId}/vaccinations`, null, treatingVetToken);
  const vacList = rVacGet.body?.data || rVacGet.body;
  assert(
    'VET-03: Treating vet → GET vaccinations → 200 with list',
    rVacGet.status === 200 && Array.isArray(vacList) && vacList.length > 0,
    `Got ${rVacGet.status}, count: ${Array.isArray(vacList) ? vacList.length : 'N/A'}`
  );

  const rTimelineGet = await request('GET', `/api/v1/doctors/pets/${petId}/timeline`, null, treatingVetToken);
  const timelineList = rTimelineGet.body?.data || rTimelineGet.body;
  assert(
    'VET-04: Treating vet → GET timeline → 200 with chronological events',
    rTimelineGet.status === 200 && Array.isArray(timelineList) && timelineList.length > 0,
    `Got ${rTimelineGet.status}, count: ${Array.isArray(timelineList) ? timelineList.length : 'N/A'}`
  );

  // ── SECTION 5: QR Verification Endpoint ──────────────────────────────────
  section('SECTION 5 — QR Subsystem Verification');

  const rQrInvalid = await request(
    'POST',
    '/api/v1/qr/verify',
    { token: 'HVQR-NONEXISTENT001', deviceInfo: 'Batch 3 Integration Runner' },
    humanDoctorToken
  );
  const qrData = rQrInvalid.body?.data || rQrInvalid.body;
  assert(
    'QR-01: Nonexistent token → 200 with isValid=false and status=INVALID',
    rQrInvalid.status === 200 && qrData?.isValid === false && qrData?.status === 'INVALID',
    `Got status: ${rQrInvalid.status}, isValid: ${qrData?.isValid}, status: ${qrData?.status}`
  );

  const rQrMissing = await request('POST', '/api/v1/qr/verify', { deviceInfo: 'Test Runner' }, humanDoctorToken);
  assert(
    'QR-02: Missing token field in body → 400 Bad Request',
    rQrMissing.status === 400 || rQrMissing.status === 422,
    `Got ${rQrMissing.status}`
  );

  const rQrUnauth = await request('POST', '/api/v1/qr/verify', { token: 'HVQR-ANYTOKEN00000001' });
  assert(
    'QR-03: Unauthenticated QR verify call → 401 Unauthorized',
    rQrUnauth.status === 401,
    `Got ${rQrUnauth.status}`
  );

  // ── SECTION 6: Unauthenticated Endpoint Protection ───────────────────────
  section('SECTION 6 — Unauthenticated Barrier Guards');

  const unauthEndpoints = [
    ['GET', '/api/v1/doctors/patients'],
    ['GET', '/api/v1/doctors/pets'],
    ['GET', '/api/v1/referrals'],
    ['GET', `/api/v1/doctors/patients/${humanPatientId}/medical-records`],
    ['GET', `/api/v1/doctors/pets/${petId}/vaccinations`],
    ['GET', `/api/v1/doctors/pets/${petId}/timeline`],
  ];

  for (const [m, p] of unauthEndpoints) {
    const r = await request(m, p);
    assert(`SEC-UNAUTH: ${m} ${p} → 401`, r.status === 401, `Got ${r.status}`);
  }

  // ── SECTION 7: Batch 1 & 2 Non-Regression ─────────────────────────────────
  section('SECTION 7 — Batch 1 & Batch 2 Regression Protection');

  const rPatients = await request('GET', '/api/v1/doctors/patients?limit=5', null, humanDoctorToken);
  assert(
    'REG-01: Batch 1 — Human doctor patient directory query → 200',
    rPatients.status === 200,
    `Got ${rPatients.status}`
  );

  const rPrescriptions = await request(
    'GET',
    `/api/v1/doctors/patients/${humanPatientId}/prescriptions`,
    null,
    humanDoctorToken
  );
  assert(
    'REG-02: Batch 2 — Patient prescriptions query responds (not 500)',
    rPrescriptions.status !== 500,
    `Got ${rPrescriptions.status}`
  );

  const rPdfExport = await request(
    'GET',
    '/api/v1/prescriptions/00000000-0000-0000-0000-000000000001/export',
    null,
    humanDoctorToken
  );
  assert(
    'REG-03: Batch 2 — Prescription export endpoint responds (not 500)',
    rPdfExport.status !== 500,
    `Got ${rPdfExport.status}`
  );

  // ── SECTION 8: Architectural Verification (Doctor Web) ───────────────────
  section('SECTION 8 — Architectural Verification (No Camera QR in Doctor Web)');

  const modalPath = 'd:\\careid\\doctor_web\\src\\components\\shared\\QRScannerModal.tsx';
  assert(
    'ARCH-01: QRScannerModal.tsx has been deleted from disk',
    !fs.existsSync(modalPath),
    fs.existsSync(modalPath) ? 'File still present!' : 'Confirmed deleted'
  );

  const dirPageCode = fs.readFileSync(
    'd:\\careid\\doctor_web\\src\\pages\\patients\\PatientDirectoryPage.tsx',
    'utf8'
  );
  assert(
    'ARCH-02: PatientDirectoryPage does not import QRScannerModal',
    !dirPageCode.includes('QRScannerModal'),
    dirPageCode.includes('QRScannerModal') ? 'Import found' : 'No import'
  );
  assert(
    'ARCH-03: PatientDirectoryPage does not render <QRScannerModal',
    !dirPageCode.includes('<QRScannerModal'),
    dirPageCode.includes('<QRScannerModal') ? 'Render found' : 'No render'
  );
  assert(
    'ARCH-04: PatientDirectoryPage does not have isQRModalOpen state',
    !dirPageCode.includes('isQRModalOpen'),
    dirPageCode.includes('isQRModalOpen') ? 'State found' : 'No state'
  );

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   TEST EXECUTION SUMMARY                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║   PASSED: ${String(passed).padEnd(3)}  FAILED: ${String(failed).padEnd(3)}  TOTAL: ${String(passed + failed).padEnd(3)}              ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  await pgClient.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n  FATAL ERROR:', err);
  process.exit(2);
});
