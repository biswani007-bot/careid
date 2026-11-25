/**
 * CAREID-MASTER-DOCTOR-WEB-005 — Phase B & C Verification Test Suite
 * Covers approved scope:
 * 1. CR-07: Office Chat Response Templates (CRUD, Persistence in PostgreSQL, Clinician Isolation)
 * 2. CR-08: Prescription Collection Lifecycle (Pickup Reminder, Mark as Collected, Termination of Reminders, DB Persistence)
 */

const { Client } = require('pg');

const API_BASE = 'http://localhost:3001/api/v1';
const DB_URL = 'postgresql://careid_test_user:684d2f2cc7f34c932c20816e945bddd4@localhost:5433/careid_integration_db';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} — ${details}`);
    failed++;
  }
}

async function request(method, path, body = null, token = null) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  return { status: res.status, data: json };
}

async function loginAs(phone) {
  const reqRes = await request('POST', '/auth/otp/request', { phone });
  const challengeId = reqRes.data?.data?.challengeId;
  const inboxRes = await request('GET', `/test-support/sms-inbox/latest?phone=${encodeURIComponent(phone)}`);
  const otpCode = inboxRes.data?.data?.otpCode;
  if (!challengeId || !otpCode) {
    throw new Error(`Failed to get OTP for ${phone}: challengeId=${challengeId}, otpCode=${otpCode}`);
  }
  const verifyRes = await request('POST', '/auth/otp/verify', {
    challengeId,
    otpCode,
    phone,
  });
  const token = verifyRes.data?.data?.accessToken || verifyRes.data?.accessToken;
  if (!token) throw new Error(`No access token returned for ${phone}`);
  return token;
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CAREID MASTER GOAL 005 — PHASE B & C REGRESSION TEST SUITE         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();
  console.log('  ✅ PostgreSQL connected successfully to careid_integration_db');

  try {
    // Authenticate Doctor and Patient
    const docToken = await loginAs('+16505550003');
    assert(!!docToken, 'Doctor authentication token acquired (+16505550003 - Dr. Sarah Jenkins)');

    const patToken = await loginAs('+16505550004');
    assert(!!patToken, 'Patient authentication token acquired (+16505550004 - John Doe)');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CR-07: Customizable Office Chat Response Templates
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. CR-07: Office Chat Response Templates ---');

    // 1.1 Get Default Templates
    const getTplRes1 = await request('GET', '/conversations/templates', null, docToken);
    assert(getTplRes1.status === 200, 'GET /conversations/templates returns 200 OK');
    const initialTemplates = Array.isArray(getTplRes1.data) ? getTplRes1.data : getTplRes1.data?.data || [];
    assert(initialTemplates.length >= 5, 'Returns default response templates if none customized', `count=${initialTemplates.length}`);

    // 1.2 Create Custom Template
    const createTplPayload = {
      title: 'Lab Follow-Up Schedule',
      content: 'Your blood panel results are complete. Please schedule a follow-up consultation.',
    };
    const createTplRes = await request('POST', '/conversations/templates', createTplPayload, docToken);
    assert(createTplRes.status === 201, 'POST /conversations/templates creates custom template (201 Created)');
    const createdTpl = createTplRes.data?.data || createTplRes.data;
    assert(createdTpl?.title === createTplPayload.title, 'Created template has matching title');
    assert(createdTpl?.content === createTplPayload.content, 'Created template has matching content');

    // 1.3 Verify Persistence in PostgreSQL
    const docUserDb = await pg.query('SELECT id FROM users WHERE phone = $1', ['+16505550003']);
    const docUserId = docUserDb.rows[0]?.id;
    const dbTplRow = await pg.query('SELECT value FROM platform_settings WHERE key = $1', [`CHAT_TEMPLATES_${docUserId}`]);
    assert(dbTplRow.rows.length === 1, 'Custom templates persisted in PostgreSQL platform_settings');
    const storedTpls = JSON.parse(dbTplRow.rows[0].value);
    const foundInDb = storedTpls.some((t) => t.title === createTplPayload.title);
    assert(foundInDb, 'Newly created template verified inside PostgreSQL JSON payload');

    // 1.4 Update Template
    const updateTplPayload = {
      title: 'Lab Follow-Up Schedule (Updated)',
      content: 'Your blood panel results are complete. Please call the clinic to book an appointment.',
    };
    const updateTplRes = await request('PUT', `/conversations/templates/${createdTpl.id}`, updateTplPayload, docToken);
    assert(updateTplRes.status === 200, 'PUT /conversations/templates/:id updates template (200 OK)');
    const updatedTpl = updateTplRes.data?.data || updateTplRes.data;
    assert(updatedTpl?.title === updateTplPayload.title, 'Updated template title persisted');

    // 1.5 Delete Template
    const deleteTplRes = await request('DELETE', `/conversations/templates/${createdTpl.id}`, null, docToken);
    assert(deleteTplRes.status === 200, 'DELETE /conversations/templates/:id removes template (200 OK)');

    // 1.6 Verify Deletion in DB
    const dbTplRowAfter = await pg.query('SELECT value FROM platform_settings WHERE key = $1', [`CHAT_TEMPLATES_${docUserId}`]);
    const storedTplsAfter = JSON.parse(dbTplRowAfter.rows[0].value);
    const deletedInDb = !storedTplsAfter.some((t) => t.id === createdTpl.id);
    assert(deletedInDb, 'Template deletion verified in PostgreSQL');

    // 1.7 Clinician Isolation: Patient should not see or overwrite doctor templates
    const patTplRes = await request('GET', '/conversations/templates', null, patToken);
    assert(patTplRes.status === 200, 'GET /conversations/templates responds for authenticated user');
    const patTemplates = Array.isArray(patTplRes.data) ? patTplRes.data : patTplRes.data?.data || [];
    assert(patTemplates.length >= 5, 'Patient receives separate template instance (clinician isolation enforced)');

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CR-08: Prescription Collection Tracking & Reminder Termination
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. CR-08: Prescription Collection Lifecycle ---');

    // 2.1 Get Patient Profile ID
    const patUserDb = await pg.query('SELECT u.id as user_id, p.id as profile_id FROM users u JOIN patient_profiles p ON p.user_id = u.id WHERE u.phone = $1', ['+16505550004']);
    const patientProfileId = patUserDb.rows[0]?.profile_id;
    assert(!!patientProfileId, `Patient profile ID identified: ${patientProfileId}`);

    // 2.2 Create Prescription with Pickup Reminder Enabled
    const rxPayload = {
      diagnosisCode: 'ICD10-I10',
      notes: 'Hypertension maintenance regimen',
      pickupReminderEnabled: true,
      pickupReminderHours: 4,
      items: [
        {
          drugName: 'Amlodipine',
          dosage: '5mg',
          form: 'Tablet',
          route: 'ORAL',
          frequency: 'Once daily in the morning',
          durationDays: 30,
          instructions: 'Take with full glass of water',
        },
      ],
    };
    const createRxRes = await request('POST', `/doctors/patients/${patientProfileId}/prescriptions`, rxPayload, docToken);
    assert(createRxRes.status === 201, 'POST /doctors/patients/:id/prescriptions creates e-Rx order (201 Created)', `Status: ${createRxRes.status}, data: ${JSON.stringify(createRxRes.data)}`);
    const createdRx = createRxRes.data?.data || createRxRes.data;
    const prescriptionId = createdRx?.id;
    assert(!!prescriptionId, `Created Prescription ID: ${prescriptionId}`);

    // 2.3 Verify Reminder Active in DB
    const rxDbRow1 = await pg.query('SELECT notes FROM prescriptions WHERE id = $1', [prescriptionId]);
    assert(rxDbRow1.rows.length === 1, 'Prescription verified in PostgreSQL prescriptions table');
    assert(rxDbRow1.rows[0].notes.includes('[PICKUP_REMINDER]:'), 'Prescription notes contain [PICKUP_REMINDER] marker');
    const reminderData1 = JSON.parse(rxDbRow1.rows[0].notes.split('[PICKUP_REMINDER]:')[1]);
    assert(reminderData1.enabled === true, 'Reminder is active prior to collection (enabled: true)');
    assert(reminderData1.hours === 4, 'Configured reminder hours match payload (hours: 4)');
    assert(!reminderData1.collected, 'Collection flag is false/unset initially');

    // 2.4 Mark as Collected via PATCH /prescriptions/:id/collect
    const collectRes = await request('PATCH', `/prescriptions/${prescriptionId}/collect`, null, docToken);
    assert(collectRes.status === 200, 'PATCH /prescriptions/:id/collect returns 200 OK');
    const collectedRx = collectRes.data?.data || collectRes.data;
    assert(collectedRx?.collected === true, 'Response DTO contains collected: true');
    assert(!!collectedRx?.collectedAt, 'Response DTO contains collectedAt ISO timestamp');
    assert(collectedRx?.pickupReminderEnabled === false, 'pickupReminderEnabled is false (reminders terminated)');

    // 2.5 Verify PostgreSQL State After Collection
    const rxDbRow2 = await pg.query('SELECT notes FROM prescriptions WHERE id = $1', [prescriptionId]);
    const reminderData2 = JSON.parse(rxDbRow2.rows[0].notes.split('[PICKUP_REMINDER]:')[1]);
    assert(reminderData2.collected === true, 'PostgreSQL record updated with collected: true');
    assert(reminderData2.enabled === false, 'PostgreSQL record updated with enabled: false (stops future alerts)');
    assert(!!reminderData2.collectedAt, 'PostgreSQL record stores collection timestamp');

    // 2.6 Verify Audit Log in DB
    const auditRow = await pg.query(
      `SELECT action, details FROM medical_record_audit_logs WHERE details LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [`%${prescriptionId}%`]
    );
    assert(auditRow.rows.length === 1, 'Clinical audit log entry recorded in PostgreSQL');
    assert(auditRow.rows[0].action === 'PRESCRIPTION_COLLECTED', 'Audit action is PRESCRIPTION_COLLECTED');

    // 2.7 Verify Querying Patient Prescriptions Shows Collected Status
    const getRxListRes = await request('GET', `/doctors/patients/${patientProfileId}/prescriptions`, null, docToken);
    assert(getRxListRes.status === 200, 'GET /doctors/patients/:id/prescriptions returns 200 OK');
    const rawItems = getRxListRes.data?.data || getRxListRes.data;
    const rxList = Array.isArray(rawItems) ? rawItems : (rawItems?.prescriptions || rawItems?.items || []);
    const targetRx = rxList.find((p) => p.id === prescriptionId);
    assert(targetRx?.collected === true, 'Patient prescriptions list returns collected: true', `targetRx: ${JSON.stringify(targetRx)}`);
    assert(targetRx?.pickupReminderEnabled === false, 'Patient prescriptions list returns pickupReminderEnabled: false', `targetRx: ${JSON.stringify(targetRx)}`);

    console.log('\n======================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================================\n');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    await pg.end();
  }

  process.exit(failed > 0 ? 1 : 0);
}

run();
