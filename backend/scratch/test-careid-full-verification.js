const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_PASSWORD = 'SecureAdminPassword123!';
const FIXED_OTP = '123456';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    let postData = null;
    if (body !== null) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function getPayload(res) {
  if (res && res.body && typeof res.body === 'object' && res.body.data !== undefined) {
    return res.body.data;
  }
  return res.body;
}

const results = {
  health: [],
  authRoleTests: [],
  authorizationTests: [],
  apiResponseTests: [],
  tokenTests: [],
};

function recordTest(category, name, passed, details) {
  results[category].push({ name, passed, details });
  const mark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${mark}] ${category.toUpperCase()} - ${name}`);
  if (!passed) {
    console.error('   Details:', details);
  }
}

async function runVerification() {
  console.log('================================================================');
  console.log('CareID Local Docker Backend — End-to-End Release Gate Tests');
  console.log('================================================================\n');

  // 1. Health & Readiness checks
  console.log('--- Step 1: Health & Readiness Probes ---');
  try {
    const resHealth = await request('GET', '/api/v1/health');
    const healthPayload = getPayload(resHealth);
    recordTest('health', 'GET /api/v1/health returns 200 OK', resHealth.status === 200 && healthPayload?.status === 'ok', resHealth.body);

    const resLive = await request('GET', '/api/v1/live');
    const livePayload = getPayload(resLive);
    recordTest('health', 'GET /api/v1/live returns 200 OK', resLive.status === 200 && livePayload?.status === 'live', resLive.body);

    const resReady = await request('GET', '/api/v1/ready');
    const readyPayload = getPayload(resReady);
    recordTest('health', 'GET /api/v1/ready returns 200 OK (DB Connected)', resReady.status === 200 && readyPayload?.database === 'connected', resReady.body);
  } catch (err) {
    recordTest('health', 'Health probes connectivity', false, err.message);
  }

  // 2. Authentication Flow for Every Role
  console.log('\n--- Step 2: Authentication Flows for All 7 Roles ---');
  const tokens = {};

  // 2.1 SUPER_ADMIN
  try {
    // Correct password login
    const res = await request('POST', '/api/v1/auth/password/login', {
      identifier: 'superadmin@careid.test',
      password: ADMIN_PASSWORD,
    });
    const payload = getPayload(res);
    const passed = res.status === 200 && res.body?.success === true && !!(payload?.accessToken || payload?.access_token);
    recordTest('authRoleTests', 'SUPER_ADMIN Password Login (POST /api/v1/auth/password/login)', passed, res.body);
    if (passed) {
      tokens.SUPER_ADMIN = payload.accessToken || payload.access_token;
      tokens.SUPER_ADMIN_REFRESH = payload.refreshToken || payload.refresh_token;
    }

    // Legacy alias
    const resAlias = await request('POST', '/api/v1/auth/admin/login', {
      identifier: 'superadmin@careid.test',
      password: ADMIN_PASSWORD,
    });
    recordTest('authRoleTests', 'SUPER_ADMIN Legacy Alias (POST /api/v1/auth/admin/login)', resAlias.status === 200 && resAlias.body?.success === true, resAlias.body);

    // Negative: wrong password
    const resWrong = await request('POST', '/api/v1/auth/password/login', {
      identifier: 'superadmin@careid.test',
      password: 'WrongPassword123!',
    });
    recordTest('authRoleTests', 'SUPER_ADMIN Wrong Password Rejected (401)', resWrong.status === 401, resWrong.body);

    // Negative: missing fields
    const resMissing = await request('POST', '/api/v1/auth/password/login', {
      identifier: 'superadmin@careid.test',
    });
    recordTest('authRoleTests', 'SUPER_ADMIN Missing Password Validation (400)', resMissing.status === 400, resMissing.body);

    // Verify /me with token
    if (tokens.SUPER_ADMIN) {
      const me = await request('GET', '/api/v1/auth/me', null, { Authorization: `Bearer ${tokens.SUPER_ADMIN}` });
      const mePayload = getPayload(me);
      recordTest(
        'authRoleTests',
        'SUPER_ADMIN Identity & Role Claims (/auth/me)',
        me.status === 200 && mePayload?.roles?.includes('SUPER_ADMIN'),
        me.body
      );
    }
  } catch (err) {
    recordTest('authRoleTests', 'SUPER_ADMIN Tests Execution', false, err.message);
  }

  // 2.2 ADMIN
  try {
    const res = await request('POST', '/api/v1/auth/password/login', {
      identifier: 'admin@careid.test',
      password: ADMIN_PASSWORD,
    });
    const payload = getPayload(res);
    const passed = res.status === 200 && res.body?.success === true && !!(payload?.accessToken || payload?.access_token);
    recordTest('authRoleTests', 'ADMIN Password Login (POST /api/v1/auth/password/login)', passed, res.body);
    if (passed) {
      tokens.ADMIN = payload.accessToken || payload.access_token;
      tokens.ADMIN_REFRESH = payload.refreshToken || payload.refresh_token;
    }

    // Verify /me with token
    if (tokens.ADMIN) {
      const me = await request('GET', '/api/v1/auth/me', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      const mePayload = getPayload(me);
      recordTest(
        'authRoleTests',
        'ADMIN Identity & Role Claims (/auth/me)',
        me.status === 200 && mePayload?.roles?.includes('ADMIN'),
        me.body
      );
    }
  } catch (err) {
    recordTest('authRoleTests', 'ADMIN Tests Execution', false, err.message);
  }

  // Helper for OTP roles
  async function testOtpRole(roleName, phone, ipIndex) {
    const clientIp = `192.168.10.${ipIndex}`;
    const ipHeaders = { 'X-Forwarded-For': clientIp };
    try {
      // 1. Request OTP
      const reqOtp = await request('POST', '/api/v1/auth/otp/request', { phone }, ipHeaders);
      const reqPayload = getPayload(reqOtp);
      const reqPassed = reqOtp.status === 200 && !!reqPayload?.challengeId;
      recordTest('authRoleTests', `${roleName} OTP Request (POST /api/v1/auth/otp/request)`, reqPassed, reqOtp.body);

      if (!reqPassed) return;
      const challengeId = reqPayload.challengeId;

      // 2. Negative test: wrong OTP code on challenge (increments attempt, keeps challenge valid for retry)
      const wrongOtp = await request('POST', '/api/v1/auth/otp/verify', {
        challengeId,
        otpCode: '000000',
        phone,
      }, ipHeaders);
      recordTest('authRoleTests', `${roleName} Wrong OTP Rejected (401)`, wrongOtp.status === 401, wrongOtp.body);

      // 3. Verify correct OTP on the active challenge
      const verifyRes = await request('POST', '/api/v1/auth/otp/verify', {
        challengeId,
        otpCode: FIXED_OTP,
        phone,
      }, ipHeaders);
      const verifyPayload = getPayload(verifyRes);
      const verifyPassed = verifyRes.status === 200 && !!(verifyPayload?.accessToken || verifyPayload?.access_token);
      recordTest('authRoleTests', `${roleName} OTP Verify (POST /api/v1/auth/otp/verify)`, verifyPassed, verifyRes.body);

      if (verifyPassed) {
        tokens[roleName] = verifyPayload.accessToken || verifyPayload.access_token;
        tokens[`${roleName}_REFRESH`] = verifyPayload.refreshToken || verifyPayload.refresh_token;

        // 4. Verify /me
        const me = await request('GET', '/api/v1/auth/me', null, { Authorization: `Bearer ${tokens[roleName]}`, ...ipHeaders });
        const mePayload = getPayload(me);
        const mePassed = me.status === 200 && mePayload?.roles?.includes(roleName) && mePayload?.phone === phone;
        recordTest('authRoleTests', `${roleName} Authenticated Identity (/auth/me)`, mePassed, me.body);
      }
    } catch (err) {
      recordTest('authRoleTests', `${roleName} OTP Flow Execution`, false, err.message);
    }
  }

  // 2.3 DOCTOR
  await testOtpRole('DOCTOR', '+16505550003', 3);

  // 2.4 PATIENT
  await testOtpRole('PATIENT', '+16505550004', 4);

  // 2.5 FACILITY_ADMIN
  await testOtpRole('FACILITY_ADMIN', '+16505550005', 5);

  // 2.6 STAFF
  await testOtpRole('STAFF', '+16505550006', 6);

  // 2.7 FAMILY_MEMBER
  await testOtpRole('FAMILY_MEMBER', '+16505550007', 7);

  // 3. Token & Session Management Tests
  console.log('\n--- Step 3: Token Validation & Session Tests ---');
  try {
    // Missing token
    const resNoToken = await request('GET', '/api/v1/auth/me');
    recordTest('tokenTests', 'Missing token rejected with 401', resNoToken.status === 401, resNoToken.body);

    // Invalid / malformed token
    const resBadToken = await request('GET', '/api/v1/auth/me', null, { Authorization: 'Bearer invalid.token.value' });
    recordTest('tokenTests', 'Invalid token rejected with 401', resBadToken.status === 401, resBadToken.body);

    // Refresh Token rotation
    if (tokens.ADMIN_REFRESH) {
      const resRefresh = await request('POST', '/api/v1/auth/token/refresh', { refreshToken: tokens.ADMIN_REFRESH });
      const refreshPayload = getPayload(resRefresh);
      const refreshPassed = resRefresh.status === 200 && !!(refreshPayload?.accessToken || refreshPayload?.access_token);
      recordTest('tokenTests', 'Token Refresh rotation succeeds (POST /api/v1/auth/token/refresh)', refreshPassed, resRefresh.body);
    }
  } catch (err) {
    recordTest('tokenTests', 'Token tests execution', false, err.message);
  }

  // 4. Role-Based Access Control (RBAC) & Authorization Tests
  console.log('\n--- Step 4: Role-Based Authorization Checks ---');
  try {
    // Positive: ADMIN accessing facilities
    if (tokens.ADMIN) {
      const resFac = await request('GET', '/api/v1/facilities', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      recordTest('authorizationTests', 'Positive: ADMIN allowed to GET /api/v1/facilities (200)', resFac.status === 200, resFac.body);
    }

    // Positive: FACILITY_ADMIN accessing staff
    if (tokens.FACILITY_ADMIN) {
      const resStaff = await request('GET', '/api/v1/staff', null, { Authorization: `Bearer ${tokens.FACILITY_ADMIN}` });
      recordTest('authorizationTests', 'Positive: FACILITY_ADMIN allowed to GET /api/v1/staff (200)', resStaff.status === 200, resStaff.body);
    }

    // Negative: PATIENT forbidden from GET /api/v1/staff (403)
    if (tokens.PATIENT) {
      const resPatientStaff = await request('GET', '/api/v1/staff', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      recordTest('authorizationTests', 'Negative: PATIENT forbidden from GET /api/v1/staff (403)', resPatientStaff.status === 403, resPatientStaff.body);
    }

    // Negative: DOCTOR forbidden from GET /api/v1/staff (403)
    if (tokens.DOCTOR) {
      const resDocStaff = await request('GET', '/api/v1/staff', null, { Authorization: `Bearer ${tokens.DOCTOR}` });
      recordTest('authorizationTests', 'Negative: DOCTOR forbidden from GET /api/v1/staff (403)', resDocStaff.status === 403, resDocStaff.body);
    }

    // Negative: PATIENT forbidden from doctor verification pending (403)
    if (tokens.PATIENT) {
      const resPending = await request('GET', '/api/v1/doctors/verification/pending', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      recordTest('authorizationTests', 'Negative: PATIENT forbidden from GET /api/v1/doctors/verification/pending (403)', resPending.status === 403, resPending.body);
    }

    // Positive: DOCTOR allowed to list doctors
    if (tokens.DOCTOR) {
      const resDocs = await request('GET', '/api/v1/doctors', null, { Authorization: `Bearer ${tokens.DOCTOR}` });
      recordTest('authorizationTests', 'Positive: DOCTOR allowed to GET /api/v1/doctors (200)', resDocs.status === 200, resDocs.body);
    }

    // Positive: PATIENT allowed to view own profile
    if (tokens.PATIENT) {
      const resPatMe = await request('GET', '/api/v1/patients/me', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      const patPayload = getPayload(resPatMe);
      const patPassed = resPatMe.status === 200 && !!(patPayload?.patientProfile?.id || patPayload?.id);
      recordTest('authorizationTests', 'Positive: PATIENT allowed to GET /api/v1/patients/me (200)', patPassed, resPatMe.body);

      // Positive: PATIENT access to own medical records
      const resRecords = await request('GET', '/api/v1/medical-records', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      recordTest('authorizationTests', 'Positive: PATIENT allowed to GET /api/v1/medical-records (200)', resRecords.status === 200, resRecords.body);

      // Positive: PATIENT access to active Health Card
      const resCard = await request('GET', '/api/v1/health-cards', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      recordTest('authorizationTests', 'Positive: PATIENT allowed to GET /api/v1/health-cards (200)', resCard.status === 200, resCard.body);

      // Negative: PATIENT forbidden from admin audit-logs (403)
      const resAuditForbidden = await request('GET', '/api/v1/admin/audit-logs', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      recordTest('authorizationTests', 'Negative: PATIENT forbidden from GET /api/v1/admin/audit-logs (403)', resAuditForbidden.status === 403, resAuditForbidden.body);
    }

    // Positive: ADMIN access to audit-logs
    if (tokens.ADMIN) {
      const resAudit = await request('GET', '/api/v1/admin/audit-logs', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      recordTest('authorizationTests', 'Positive: ADMIN allowed to GET /api/v1/admin/audit-logs (200)', resAudit.status === 200, resAudit.body);
    }

    // Positive: SUPER_ADMIN access to security dashboard
    if (tokens.SUPER_ADMIN) {
      const resSec = await request('GET', '/api/v1/security/dashboard', null, { Authorization: `Bearer ${tokens.SUPER_ADMIN}` });
      recordTest('authorizationTests', 'Positive: SUPER_ADMIN allowed to GET /api/v1/security/dashboard (200)', resSec.status === 200, resSec.body);
    }

    // Negative: DOCTOR forbidden from security dashboard (403)
    if (tokens.DOCTOR) {
      const resSecForbidden = await request('GET', '/api/v1/security/dashboard', null, { Authorization: `Bearer ${tokens.DOCTOR}` });
      recordTest('authorizationTests', 'Negative: DOCTOR forbidden from GET /api/v1/security/dashboard (403)', resSecForbidden.status === 403, resSecForbidden.body);
    }

    // Logout and Revocation check
    if (tokens.SUPER_ADMIN_REFRESH) {
      const resLogout = await request('POST', '/api/v1/auth/logout', { refreshToken: tokens.SUPER_ADMIN_REFRESH });
      const logoutPassed = resLogout.status === 200 && resLogout.body?.success === true;
      recordTest('authorizationTests', 'Positive: Logout revokes session (POST /api/v1/auth/logout)', logoutPassed, resLogout.body);

      // Subsequent refresh with revoked token should fail (401)
      const resRevokedRefresh = await request('POST', '/api/v1/auth/token/refresh', { refreshToken: tokens.SUPER_ADMIN_REFRESH });
      recordTest('authorizationTests', 'Revoked Refresh Token rejected on subsequent refresh (401)', resRevokedRefresh.status === 401, resRevokedRefresh.body);
    }
  } catch (err) {
    recordTest('authorizationTests', 'Authorization tests execution', false, err.message);
  }

  // 5. Representative API Responses & Schema Verification
  console.log('\n--- Step 5: Representative API Responses & Envelope Schema ---');
  try {
    if (tokens.PATIENT) {
      const resPat = await request('GET', '/api/v1/patients/me', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      const valid = resPat.status === 200 && typeof resPat.body === 'object';
      recordTest('apiResponseTests', 'Patient Profile Response Schema (/api/v1/patients/me)', valid, { status: resPat.status });

      const resNotif = await request('GET', '/api/v1/notifications', null, { Authorization: `Bearer ${tokens.PATIENT}` });
      const validNotif = resNotif.status === 200 && Array.isArray(getPayload(resNotif));
      recordTest('apiResponseTests', 'Notifications Response Schema (/api/v1/notifications)', validNotif, { status: resNotif.status });
    }

    if (tokens.DOCTOR) {
      const resDocs = await request('GET', '/api/v1/doctors', null, { Authorization: `Bearer ${tokens.DOCTOR}` });
      const docsPayload = getPayload(resDocs);
      const doctorId = docsPayload[0]?.id;
      if (doctorId) {
        const resSlots = await request('GET', `/api/v1/doctors/${doctorId}/slots`, null, { Authorization: `Bearer ${tokens.DOCTOR}` });
        const validSlots = resSlots.status === 200 && Array.isArray(getPayload(resSlots));
        recordTest('apiResponseTests', 'Doctor Schedule Slots Schema (/api/v1/doctors/:id/slots)', validSlots, { status: resSlots.status });
      }

      const resReferrals = await request('GET', '/api/v1/referrals', null, { Authorization: `Bearer ${tokens.DOCTOR}` });
      const validReferrals = resReferrals.status === 200;
      recordTest('apiResponseTests', 'Referrals Response Schema (/api/v1/referrals)', validReferrals, { status: resReferrals.status });
    }

    if (tokens.ADMIN) {
      const resFacs = await request('GET', '/api/v1/facilities', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      const facsPayload = getPayload(resFacs);
      const facId = facsPayload[0]?.id;
      if (facId) {
        const resDepts = await request('GET', `/api/v1/facilities/${facId}/departments`, null, { Authorization: `Bearer ${tokens.ADMIN}` });
        const validDepts = resDepts.status === 200 && Array.isArray(getPayload(resDepts));
        recordTest('apiResponseTests', 'Facility Departments Schema (/api/v1/facilities/:id/departments)', validDepts, { status: resDepts.status });
      }

      const resRoles = await request('GET', '/api/v1/auth/roles', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      const rolesPayload = getPayload(resRoles);
      const validRoles = resRoles.status === 200 && Array.isArray(rolesPayload?.roles || rolesPayload);
      recordTest('apiResponseTests', 'Auth Roles Response Schema (/api/v1/auth/roles)', validRoles, resRoles.body);

      const resSessions = await request('GET', '/api/v1/auth/sessions', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      const sessionsPayload = getPayload(resSessions);
      const validSessions = resSessions.status === 200 && Array.isArray(sessionsPayload);
      recordTest('apiResponseTests', 'Auth Sessions Response Schema (/api/v1/auth/sessions)', validSessions, { count: sessionsPayload?.length });

      const resPerms = await request('GET', '/api/v1/auth/permissions', null, { Authorization: `Bearer ${tokens.ADMIN}` });
      const permsPayload = getPayload(resPerms);
      const validPerms = resPerms.status === 200 && Array.isArray(permsPayload?.permissions || permsPayload);
      recordTest('apiResponseTests', 'Auth Permissions Response Schema (/api/v1/auth/permissions)', validPerms, resPerms.body);
    }
  } catch (err) {
    recordTest('apiResponseTests', 'API Response tests execution', false, err.message);
  }

  // Summary
  console.log('\n================================================================');
  console.log('Verification Test Summary');
  console.log('================================================================');
  let totalPassed = 0;
  let totalFailed = 0;
  for (const [cat, list] of Object.entries(results)) {
    const passed = list.filter((t) => t.passed).length;
    const failed = list.filter((t) => !t.passed).length;
    totalPassed += passed;
    totalFailed += failed;
    console.log(`- ${cat.padEnd(20)}: ${passed} passed, ${failed} failed`);
  }
  console.log(`Total: ${totalPassed} passed, ${totalFailed} failed out of ${totalPassed + totalFailed} tests.`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
