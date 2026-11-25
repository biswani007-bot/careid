/**
 * CAREID-MASTER-DOCTOR-WEB-004 Regression & Defect Verification Suite
 *
 * Verifies fixes for:
 * 1. SEC-DEFECT-01: Messaging participant authorization
 *    - Unrelated doctor blocked (403) from conversation detail, messages, sending, and markAsRead.
 *    - Participant doctor allowed (200/201).
 * 2. SEC-DEFECT-02: Schedule ownership authorization
 *    - Doctor can create, update, and generate slots for their own schedule.
 *    - Unrelated doctor blocked (403) from updating, generating slots, blocking, or adding leave to another doctor's schedule.
 * 3. AUDIT-DEFECT-01: HIPAA Audit Log endpoint accessibility
 *    - Doctor can retrieve audit access logs via GET /api/v1/security/audit (200).
 * 4. OUTCOMES-DEFECT-01: Clinical Outcomes / Module Analytics authorization
 *    - Doctor can access module analytics via GET /api/v1/reports/analytics/modules/patient (200).
 * 5. EHR-DEFECT-01: Health check latency & operational probe
 *    - GET /api/v1/health returns 200 OK.
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
  let reqRes = await request('POST', '/auth/otp/request', { phone });
  let challengeId = reqRes.data?.data?.challengeId;
  if (!challengeId) {
    await new Promise((r) => setTimeout(r, 1200));
    reqRes = await request('POST', '/auth/otp/request', { phone });
    challengeId = reqRes.data?.data?.challengeId;
  }
  const inboxRes = await request('GET', `/test-support/sms-inbox/latest?phone=${encodeURIComponent(phone)}`);
  const otpCode = inboxRes.data?.data?.otpCode;
  if (!challengeId || !otpCode) {
    throw new Error(`Failed to get OTP for ${phone}: status=${reqRes.status}, reqBody=${JSON.stringify(reqRes.data)}, otpCode=${otpCode}`);
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
  console.log('║   CAREID MASTER GOAL 004 — REGRESSION & DEFECT VERIFICATION SUITE   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();
  console.log('  ✅ PostgreSQL connected successfully');

  // 1. Authenticate Doctor 1 (Sarah Jenkins) & Doctor 2 (Unrelated Doctor)
  const doc1Token = await loginAs('+16505550003');
  console.log('  ✅ Doctor 1 token acquired (+16505550003, Dr. Sarah Jenkins)');

  const doc2Token = await loginAs('+16505552336');
  console.log('  ✅ Doctor 2 token acquired (+16505552336, Dr. Unrelated)');

  // Patient profile
  const patientRow = (await pg.query(`
    SELECT id, first_name, last_name FROM patient_profiles LIMIT 1;
  `)).rows[0];
  const humanPatientId = patientRow.id;
  console.log(`  ℹ Human Patient Profile: ${humanPatientId} (${patientRow.first_name} ${patientRow.last_name})\n`);

  // ============================================================================
  // SECTION 1 — SEC-DEFECT-01: Messaging Participant Authorization
  // ============================================================================
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  SECTION 1 — SEC-DEFECT-01: Messaging Participant Authorization');
  console.log('══════════════════════════════════════════════════════════════════════');

  // Doctor 1 creates conversation with patient
  const createConvRes = await request('POST', '/conversations', {
    participantId: humanPatientId,
    subject: 'Goal 004 Care Plan Discussion',
    initialMessage: 'Welcome to your care plan consultation.',
  }, doc1Token);

  const convId = createConvRes.data?.data?.id || createConvRes.data?.id;
  assert(createConvRes.status === 201 && convId, 'SEC-01a: Doctor 1 creates conversation thread', `status=${createConvRes.status}`);

  if (convId) {
    // Doctor 1 (participant) can get conversation
    const getConv1 = await request('GET', `/conversations/${convId}`, null, doc1Token);
    assert(getConv1.status === 200, 'SEC-01b: Participant Doctor 1 can retrieve conversation detail', `status=${getConv1.status}`);

    // Doctor 1 (participant) can get messages
    const getMsg1 = await request('GET', `/conversations/${convId}/messages`, null, doc1Token);
    assert(getMsg1.status === 200, 'SEC-01c: Participant Doctor 1 can read conversation messages', `status=${getMsg1.status}`);

    // Doctor 1 (participant) can send message
    const sendMsg1 = await request('POST', `/conversations/${convId}/messages`, {
      content: 'Follow-up advice: monitor resting pulse.',
    }, doc1Token);
    assert(sendMsg1.status === 201, 'SEC-01d: Participant Doctor 1 can post messages', `status=${sendMsg1.status}`);

    // Doctor 1 (participant) can mark as read
    const readMsg1 = await request('PUT', `/conversations/${convId}/read`, {}, doc1Token);
    assert(readMsg1.status === 200, 'SEC-01e: Participant Doctor 1 can mark conversation read', `status=${readMsg1.status}`);

    // Doctor 2 (unrelated) BLOCKED from get conversation
    const getConv2 = await request('GET', `/conversations/${convId}`, null, doc2Token);
    assert(getConv2.status === 403, 'SEC-01f: Unrelated Doctor 2 BLOCKED (403) from conversation detail', `status=${getConv2.status}`);

    // Doctor 2 (unrelated) BLOCKED from get messages
    const getMsg2 = await request('GET', `/conversations/${convId}/messages`, null, doc2Token);
    assert(getMsg2.status === 403, 'SEC-01g: Unrelated Doctor 2 BLOCKED (403) from conversation messages', `status=${getMsg2.status}`);

    // Doctor 2 (unrelated) BLOCKED from sending message
    const sendMsg2 = await request('POST', `/conversations/${convId}/messages`, {
      content: 'Unauthorized intrusion attempt.',
    }, doc2Token);
    assert(sendMsg2.status === 403, 'SEC-01h: Unrelated Doctor 2 BLOCKED (403) from posting message', `status=${sendMsg2.status}`);

    // Doctor 2 (unrelated) BLOCKED from mark as read
    const readMsg2 = await request('PUT', `/conversations/${convId}/read`, {}, doc2Token);
    assert(readMsg2.status === 403, 'SEC-01i: Unrelated Doctor 2 BLOCKED (403) from marking conversation read', `status=${readMsg2.status}`);
  }

  // ============================================================================
  // SECTION 2 — SEC-DEFECT-02: Schedule Ownership Authorization
  // ============================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  SECTION 2 — SEC-DEFECT-02: Schedule Ownership Authorization');
  console.log('══════════════════════════════════════════════════════════════════════');

  // Query Doctor 1's profile ID
  const doc1Profile = (await pg.query(`
    SELECT dp.id FROM doctor_profiles dp JOIN users u ON u.id = dp.user_id WHERE u.phone = '+16505550003' LIMIT 1;
  `)).rows[0];
  const doc1ProfileId = doc1Profile?.id;

  // Doctor 1 creates a schedule
  const createSchedRes = await request('POST', '/schedules', {
    ownerType: 'DOCTOR',
    doctorProfileId: doc1ProfileId,
    title: 'Dr. Sarah Jenkins Cardiology Clinic',
    timezone: 'America/New_York',
    slotDurationMinutes: 30,
    bufferMinutes: 5,
    maxPatientsPerSlot: 1,
    effectiveFrom: '2026-11-20',
    isActive: true,
    workingHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', sessionType: 'MORNING', isEnabled: true },
    ],
  }, doc1Token);

  const schedId = createSchedRes.data?.data?.id || createSchedRes.data?.id;
  assert(createSchedRes.status === 201 && schedId, 'SEC-02a: Doctor 1 creates own clinical schedule', `status=${createSchedRes.status}`);

  if (schedId) {
    // Doctor 1 (owner) can update schedule
    const updateSched1 = await request('PUT', `/schedules/${schedId}`, {
      title: 'Dr. Sarah Jenkins Cardiology Clinic — Updated',
      slotDurationMinutes: 30,
    }, doc1Token);
    assert(updateSched1.status === 200, 'SEC-02b: Schedule owner Doctor 1 can update schedule', `status=${updateSched1.status}`);

    // Doctor 1 (owner) can generate slots
    const genSlots1 = await request('POST', `/schedules/${schedId}/generate-slots`, {
      fromDate: '2026-11-23',
      toDate: '2026-11-24',
    }, doc1Token);
    assert(genSlots1.status === 200, 'SEC-02c: Schedule owner Doctor 1 can generate availability slots', `status=${genSlots1.status}`);

    // Doctor 2 (unrelated) BLOCKED from updating Doctor 1's schedule
    const updateSched2 = await request('PUT', `/schedules/${schedId}`, {
      title: 'Malicious schedule title hijack',
    }, doc2Token);
    assert(updateSched2.status === 403, 'SEC-02d: Unrelated Doctor 2 BLOCKED (403) from updating schedule', `status=${updateSched2.status}`);

    // Doctor 2 (unrelated) BLOCKED from generating slots on Doctor 1's schedule
    const genSlots2 = await request('POST', `/schedules/${schedId}/generate-slots`, {
      fromDate: '2026-11-23',
      toDate: '2026-11-24',
    }, doc2Token);
    assert(genSlots2.status === 403, 'SEC-02e: Unrelated Doctor 2 BLOCKED (403) from generating slots', `status=${genSlots2.status}`);

    // Doctor 2 (unrelated) BLOCKED from blocking Doctor 1's schedule
    const blockSched2 = await request('POST', `/schedules/${schedId}/block`, {
      exceptionType: 'VACATION',
      startDatetime: '2026-11-23T09:00:00Z',
      endDatetime: '2026-11-23T17:00:00Z',
      reason: 'Unauthorized block',
    }, doc2Token);
    assert(blockSched2.status === 403, 'SEC-02f: Unrelated Doctor 2 BLOCKED (403) from blocking schedule', `status=${blockSched2.status}`);

    // Doctor 2 (unrelated) BLOCKED from adding leave to Doctor 1's schedule
    const leaveSched2 = await request('POST', `/schedules/${schedId}/leave`, {
      leaveType: 'SICK',
      startDate: '2026-11-23',
      endDate: '2026-11-24',
      reason: 'Unauthorized leave injection',
    }, doc2Token);
    assert(leaveSched2.status === 403, 'SEC-02g: Unrelated Doctor 2 BLOCKED (403) from adding leave block', `status=${leaveSched2.status}`);
  }

  // ============================================================================
  // SECTION 3 — AUDIT-DEFECT-01: HIPAA Audit Log Verification
  // ============================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  SECTION 3 — AUDIT-DEFECT-01: HIPAA Audit Log Accessibility');
  console.log('══════════════════════════════════════════════════════════════════════');

  const auditRes = await request('GET', '/security/audit', null, doc1Token);
  const auditData = auditRes.data?.data || auditRes.data;
  assert(
    auditRes.status === 200 && Array.isArray(auditData),
    'AUDIT-01: Doctor can query security audit logs via GET /api/v1/security/audit',
    `status=${auditRes.status}, isArray=${Array.isArray(auditData)}`
  );

  // ============================================================================
  // SECTION 4 — OUTCOMES-DEFECT-01: Clinical Outcomes / Analytics
  // ============================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  SECTION 4 — OUTCOMES-DEFECT-01: Clinical Outcomes Authorization');
  console.log('══════════════════════════════════════════════════════════════════════');

  const outcomesRes = await request('GET', '/reports/analytics/modules/patient', null, doc1Token);
  assert(
    outcomesRes.status === 200,
    'OUTCOMES-01: Doctor authorized to retrieve Clinical Outcomes via GET /api/v1/reports/analytics/modules/patient',
    `status=${outcomesRes.status}`
  );

  // ============================================================================
  // SECTION 5 — EHR-DEFECT-01: Health & Latency Probe
  // ============================================================================
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  SECTION 5 — EHR-DEFECT-01: Health & Latency Probe');
  console.log('══════════════════════════════════════════════════════════════════════');

  const startProbe = Date.now();
  const healthRes = await request('GET', '/health');
  const elapsed = Date.now() - startProbe;
  assert(
    healthRes.status === 200 && healthRes.data?.data?.status === 'ok',
    `EHR-01: Real-time health probe succeeds (latency: ${elapsed}ms)`,
    `status=${healthRes.status}, data=${JSON.stringify(healthRes.data)}`
  );

  await pg.end();

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║   GOAL 004 REGRESSION TEST SUMMARY: PASSED: ${passed} | FAILED: ${failed}               ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error running Goal 004 regression suite:', err);
  process.exit(1);
});
