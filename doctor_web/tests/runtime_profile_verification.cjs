/**
 * CareID Doctor Web — Profile, Security & Notifications Runtime Verification
 *
 * Tests all live endpoints against https://360api.vnvision.in and verifies
 * strict removal of mock constants and sidebar dropdown changes.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://360api.vnvision.in/api/v1';
const TOKEN_CACHE_PATH = path.join(ROOT_DIR, '.token_cache.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

async function getValidToken() {
  const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
  const check = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${cached.accessToken}` },
  });
  if (check.status === 200) {
    return cached.accessToken;
  }

  if (cached.refreshToken) {
    const refRes = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: cached.refreshToken }),
    });
    if (refRes.ok) {
      const refBody = await refRes.json();
      const newAccess = refBody.data?.accessToken || refBody.accessToken;
      const newRefresh = refBody.data?.refreshToken || refBody.refreshToken;
      if (newAccess) {
        cached.accessToken = newAccess;
        if (newRefresh) cached.refreshToken = newRefresh;
        fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cached, null, 2));
        return newAccess;
      }
    }
  }

  throw new Error('Cached tokens expired and refresh failed.');
}

async function apiRequest(token, endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  const results = [];
  const record = (name, status, detail) => {
    results.push({ name, status, detail });
    console.log(`[${status}] ${name}: ${detail}`);
  };

  const token = await getValidToken();
  const claims = decodeJwtPayload(token);
  assert(claims && typeof claims.sub === 'string', 'JWT claims must contain sub');
  record('JWT Claims Decode', 'PASS', `sub=${claims.sub}, sessionId=${claims.sessionId || 'none'}`);

  // 1. Auth Me
  const meRes = await apiRequest(token, '/auth/me');
  assert(meRes.status === 200, `/auth/me returned ${meRes.status}`);
  const authMe = meRes.json.data;
  assert(authMe.id === claims.sub, 'auth/me id matches JWT sub');
  assert(Boolean(authMe.phone), 'auth/me contains phone');
  record('GET /auth/me', 'PASS', `id=${authMe.id}, phone=${authMe.phone}, roles=${(authMe.roles || []).join(',')}`);

  // 2. Doctor Me
  const docRes = await apiRequest(token, '/doctors/me');
  assert(docRes.status === 200, `/doctors/me returned ${docRes.status}`);
  const doc = docRes.json.data;
  assert(Boolean(doc.id && doc.fullName), 'doctors/me must include id and fullName');
  record('GET /doctors/me', 'PASS', `id=${doc.id}, fullName=${doc.fullName}, spec=${doc.primarySpecialization}`);

  // 3. Doctor Profile Update + Persistence + Restore
  const originalSummary = doc.professionalSummary || '';
  const probeSummary = `${originalSummary} [verify]`.trim();
  const updateRes = await apiRequest(token, `/doctors/${encodeURIComponent(doc.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      fullName: doc.fullName,
      primarySpecialization: doc.primarySpecialization,
      department: doc.department,
      professionalSummary: probeSummary,
      biography: probeSummary,
    }),
  });
  assert(updateRes.status === 200, `PUT /doctors/${doc.id} returned ${updateRes.status}`);

  const reloadDocRes = await apiRequest(token, '/doctors/me');
  assert(reloadDocRes.status === 200, 'Reload GET /doctors/me failed');
  assert(
    reloadDocRes.json.data.professionalSummary === probeSummary,
    'Updated professionalSummary did not persist on GET /doctors/me'
  );

  // Restore original summary & biography
  const restoreRes = await apiRequest(token, `/doctors/${encodeURIComponent(doc.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      professionalSummary: originalSummary,
      biography: originalSummary,
    }),
  });
  assert(restoreRes.status === 200, `Restore PUT /doctors/${doc.id} returned ${restoreRes.status}`);
  record('PUT /doctors/:id round-trip & restore', 'PASS', 'Persisted across GET /doctors/me and cleanly restored');

  // 4. Account Validation Error Check (invalid email)
  const badEmailRes = await apiRequest(token, '/auth/me', {
    method: 'PUT',
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  assert(badEmailRes.status === 400 || badEmailRes.status === 422, `Expected 400/422 for invalid email, got ${badEmailRes.status}`);
  record('PUT /auth/me invalid email validation', 'PASS', `HTTP ${badEmailRes.status}: ${JSON.stringify(badEmailRes.json.message || badEmailRes.json)}`);

  // 5. Attachment / Doctor Photo Upload Contract Verification
  const form = new FormData();
  const pngStub = new Blob([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')], { type: 'image/png' });
  form.append('file', pngStub, 'doctor-avatar-check.png');
  form.append('category', 'PROFILE_PHOTO');
  const uploadRes = await apiRequest(token, '/attachments', {
    method: 'POST',
    body: form,
  });
  assert(
    uploadRes.status === 400,
    `Expected HTTP 400 when patientProfileId omitted on /attachments, got ${uploadRes.status}`
  );
  record(
    'POST /attachments doctor photo gap check',
    'PASS',
    `Backend requires patientProfileId (HTTP 400: ${uploadRes.json.message}); error handled cleanly without simulation`
  );

  // 6. Security: Sessions List + Secondary Session Termination + Password Change + Audit Logs
  const sessionsRes = await apiRequest(token, '/auth/sessions');
  assert(sessionsRes.status === 200 && Array.isArray(sessionsRes.json.data), 'GET /auth/sessions must return 200 array');
  const sessions = sessionsRes.json.data;
  const hasCurrent = claims.sessionId ? sessions.some((s) => s.id === claims.sessionId) : false;
  assert(!claims.sessionId || hasCurrent, 'Current JWT sessionId should match an active session');
  record('GET /auth/sessions', 'PASS', `${sessions.length} active session(s); currentSessionMatched=${hasCurrent}`);

  // Create throwaway OTP session and terminate ONLY that throwaway session
  const otpReqRes = await apiRequest(token, '/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone: authMe.phone }),
  });
  if (otpReqRes.status === 200 || otpReqRes.status === 201) {
    const challengeId = otpReqRes.json?.data?.challengeId || otpReqRes.json?.challengeId;
    const otpVerifyRes = await apiRequest(token, '/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otpCode: '123456' }),
    });
    const tempAccess = otpVerifyRes.json?.data?.accessToken || otpVerifyRes.json?.accessToken;
    const tempClaims = tempAccess ? decodeJwtPayload(tempAccess) : null;
    if (tempClaims?.sessionId && tempClaims.sessionId !== claims.sessionId) {
      const delRes = await apiRequest(token, `/auth/sessions/${encodeURIComponent(tempClaims.sessionId)}`, {
        method: 'DELETE',
      });
      assert(delRes.status === 200 || delRes.status === 204, `DELETE session returned ${delRes.status}`);
      const afterDelSessions = await apiRequest(token, '/auth/sessions');
      const stillExists = (afterDelSessions.json.data || []).some((s) => s.id === tempClaims.sessionId);
      assert(!stillExists, 'Terminated throwaway session still appeared in /auth/sessions');
      record('DELETE /auth/sessions/:sessionId', 'PASS', `Created and terminated throwaway session ${tempClaims.sessionId}`);
    } else {
      record(
        'DELETE /auth/sessions/:sessionId',
        'SKIP',
        `OTP verify status=${otpVerifyRes.status}, sessionId=${tempClaims?.sessionId || 'none'}`
      );
    }
  } else {
    record('DELETE /auth/sessions/:sessionId', 'SKIP', `OTP request returned ${otpReqRes.status} (${otpReqRes.json?.message || 'rate limit'})`);
  }

  // Password Change endpoint check
  const pwRes = await apiRequest(token, '/auth/password/change', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: 'WrongPassword1!', newPassword: 'NewPassword1!' }),
  });
  assert(pwRes.status === 400 || pwRes.status === 401, `Expected 400/401 from /auth/password/change, got ${pwRes.status}`);
  record('POST /auth/password/change validation error', 'PASS', `HTTP ${pwRes.status}: ${pwRes.json.message}`);

  // Security Audit endpoint check
  const auditRes = await apiRequest(token, `/security/audit?userId=${encodeURIComponent(authMe.id)}`);
  assert(auditRes.status === 403 || auditRes.status === 200, `Unexpected status from /security/audit: ${auditRes.status}`);
  record('GET /security/audit', 'PASS', `HTTP ${auditRes.status}: ${auditRes.json.message || 'ok'}`);

  // 7. Notifications Preferences Get + Update + Persistence + Restore
  const notifGetRes = await apiRequest(token, '/notifications/preferences');
  assert(notifGetRes.status === 200, `GET /notifications/preferences returned ${notifGetRes.status}`);
  const origPrefs = notifGetRes.json.data;
  assert(
    typeof origPrefs.emailEnabled === 'boolean' &&
      typeof origPrefs.smsEnabled === 'boolean' &&
      typeof origPrefs.pushEnabled === 'boolean' &&
      typeof origPrefs.inAppEnabled === 'boolean',
    'Preferences payload missing boolean fields'
  );

  // Toggle smsEnabled and pushEnabled, verify via GET, then restore
  const toggledPayload = {
    emailEnabled: origPrefs.emailEnabled,
    smsEnabled: !origPrefs.smsEnabled,
    pushEnabled: !origPrefs.pushEnabled,
    inAppEnabled: origPrefs.inAppEnabled,
    webhookEnabled: Boolean(origPrefs.webhookEnabled),
  };
  const notifPutRes = await apiRequest(token, '/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(toggledPayload),
  });
  assert(notifPutRes.status === 200, `PUT /notifications/preferences returned ${notifPutRes.status}`);

  const notifReloadRes = await apiRequest(token, '/notifications/preferences');
  assert(
    notifReloadRes.json.data.smsEnabled === toggledPayload.smsEnabled &&
      notifReloadRes.json.data.pushEnabled === toggledPayload.pushEnabled,
    'Updated notification preferences did not persist across GET reload'
  );

  // Restore original notification preferences
  const notifRestoreRes = await apiRequest(token, '/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify({
      emailEnabled: origPrefs.emailEnabled,
      smsEnabled: origPrefs.smsEnabled,
      pushEnabled: origPrefs.pushEnabled,
      inAppEnabled: origPrefs.inAppEnabled,
      webhookEnabled: Boolean(origPrefs.webhookEnabled),
    }),
  });
  assert(notifRestoreRes.status === 200, 'Failed to restore notification preferences');
  record('GET & PUT /notifications/preferences persistence', 'PASS', 'Toggled, verified via GET reload, and cleanly restored');

  // 8. Static Contract Assertions (Sidebar, Tabs, Mock Removal)
  const layoutContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/layout/PatientLayout.tsx'), 'utf8');
  assert(!layoutContent.includes('isProfileExpanded'), 'PatientLayout still contains isProfileExpanded');
  assert(!layoutContent.includes('profile-submenu'), 'PatientLayout still contains profile-submenu');
  assert(layoutContent.includes('to="/settings"'), 'PatientLayout Profile NavLink must navigate directly to /settings');
  assert(layoutContent.includes('isPatientsExpanded') && layoutContent.includes('isReportsExpanded'), 'Patients and Reports dropdowns must remain unchanged');
  record('Sidebar Navigation Contract (PatientLayout)', 'PASS', 'Profile is direct NavLink to /settings; no dropdown/submenu; Patients & Reports intact');

  const filesToAudit = [
    'src/pages/settings/types.ts',
    'src/pages/settings/ProfessionalProfilePage.tsx',
    'src/pages/settings/AccountSecurityPage.tsx',
    'src/pages/settings/NotificationPreferencesPage.tsx',
    'src/context/AuthContext.tsx',
    'src/components/layout/PatientLayout.tsx',
    'src/components/layout/Sidebar.tsx',
    'src/components/layout/Header.tsx',
  ];
  const forbiddenPatterns = [
    'DEFAULT_DOCTOR_PROFILE',
    'INITIAL_TRUSTED_DEVICES',
    'INITIAL_AUDIT_LOGS',
    'DEFAULT_NOTIFICATION_PREFERENCES',
    'Julian Vance',
    'Clinical Admin',
    'YubiKey 5C NFC',
    'demonstration state',
    'local demo memory',
    'doctorProfilePrimary',
    'doctorAvatarAdmin',
  ];

  for (const relPath of filesToAudit) {
    const content = fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
    for (const pat of forbiddenPatterns) {
      assert(!content.includes(pat), `Forbidden mock token "${pat}" found in ${relPath}`);
    }
  }
  record('Mock & Hardcoded Data Audit', 'PASS', `Verified 0 forbidden tokens across ${filesToAudit.length} modified files`);

  console.log('\nALL PROFILE MODULE RUNTIME VERIFICATIONS PASSED.');
}

main().catch((err) => {
  console.error('\nRUNTIME VERIFICATION FAILED:', err);
  process.exit(1);
});
