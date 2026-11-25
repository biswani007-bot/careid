/**
 * Verification Suite: Reports & Notifications Forensic Repair
 * - Tests actual modified TypeScript services (dashboardService, reportService, patientService, authService)
 *   bundled in-memory via esbuild.
 * - Verifies edge cases (HTTP 500 propagation, empty arrays, role routing, unread filtering, StrictMode deduplication).
 * - Verifies live staging integration with Doctor JWT (+16505550003).
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const API_BASE = 'https://360api.vnvision.in';
const DOCTOR_PHONE = '+16505550003';
const DOCTOR_OTP = '123456';
const TOKEN_CACHE_PATH = path.join(ROOT, '.token_cache.json');

// Minimal browser globals for service modules running in Node
function createStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

global.sessionStorage = createStorage();
global.localStorage = createStorage();
global.window = {
  location: { href: 'http://localhost:5173/dashboard', pathname: '/dashboard' },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }
};

function makeFakeJwt(payloadObj) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  return `${header}.${payload}.sig`;
}

async function bundleServices() {
  const entrySource = `
    export { apiClient, ApiError } from './src/services/apiClient.ts';
    export { authService } from './src/services/authService.ts';
    export { dashboardService } from './src/services/dashboardService.ts';
    export { reportService, mapMedicalRecordToReport } from './src/services/reportService.ts';
  `;

  const result = await esbuild.build({
    stdin: {
      contents: entrySource,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    alias: {
      '@': path.join(ROOT, 'src'),
    },
    loader: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.svg': 'text',
    },
    define: {
      'import.meta.env': JSON.stringify({
        VITE_API_BASE_URL: API_BASE,
        MODE: 'test',
        DEV: false,
        PROD: true,
      }),
    },
  });

  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  const fn = new Function('require', 'module', 'exports', code);
  fn(require, mod, mod.exports);
  return mod.exports;
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

async function runUnitEdgeCases(services) {
  console.log('\n=== PART 1: Unit & Edge-Case Tests (Mocked HTTP) ===');
  const { dashboardService, reportService, ApiError } = services;
  const originalFetch = global.fetch;

  const doctorJwt = makeFakeJwt({
    sub: 'fa502f2e-332c-4ec0-b6aa-83713216ec88',
    roles: ['DOCTOR'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  const patientJwt = makeFakeJwt({
    sub: 'patient-user-123',
    roles: ['PATIENT'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  try {
    // Test 1: Notifications never send status=UNREAD and filter unread client-side
    global.sessionStorage.setItem('careid_access_token', doctorJwt);
    let requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      return jsonResponse(200, {
        success: true,
        data: [
          { id: 'n1', title: 'Critical K+', message: 'High potassium', status: 'DELIVERED', priority: 'CRITICAL', readAt: null },
          { id: 'n2', title: 'Old Read Alert', message: 'Already read', status: 'READ', priority: 'HIGH', readAt: '2026-01-01T00:00:00Z' },
          { id: 'n3', title: 'Read via timestamp', message: 'ReadAt set', status: 'SENT', priority: 'MEDIUM', readAt: '2026-01-02T00:00:00Z' },
          { id: 'n4', title: 'Queued Alert', message: 'Pending delivery', status: 'PENDING', priority: 'LOW', readAt: null },
        ],
      });
    };

    const unreadList = await dashboardService.getNotifications({
      recipientUserId: 'fa502f2e-332c-4ec0-b6aa-83713216ec88',
      unreadOnly: true,
    });
    assert.strictEqual(requests.length, 1);
    assert(!requests[0].includes('status=UNREAD'), `Unexpected status=UNREAD in ${requests[0]}`);
    assert(requests[0].includes('recipientUserId=fa502f2e-332c-4ec0-b6aa-83713216ec88'), 'Should pass recipientUserId');
    assert.deepStrictEqual(unreadList.map((n) => n.id), ['n1', 'n4'], 'Unread filtering should exclude READ and readAt items');

    // Backward-compatible string call 'UNREAD' also must NOT send status=UNREAD
    requests = [];
    const unreadCompat = await dashboardService.getNotifications('UNREAD');
    assert(!requests[0].includes('status=UNREAD'), 'String "UNREAD" must not send status=UNREAD');
    assert.deepStrictEqual(unreadCompat.map((n) => n.id), ['n1', 'n4']);
    console.log('PASS 1.1: Notifications never send status=UNREAD & filter unread accurately');

    // Test 2: StrictMode concurrent coalescing + subsequent manual sync still works
    requests = [];
    let resolveDelayed;
    global.fetch = (url) => {
      requests.push(String(url));
      return new Promise((resolve) => {
        resolveDelayed = () => resolve(jsonResponse(200, { success: true, data: [] }));
      });
    };
    const p1 = dashboardService.getNotifications({ recipientUserId: 'doc-1', unreadOnly: true });
    const p2 = dashboardService.getNotifications({ recipientUserId: 'doc-1', unreadOnly: true });
    assert.strictEqual(requests.length, 1, 'Concurrent identical notification calls should coalesce into 1 HTTP request');
    resolveDelayed();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.deepStrictEqual(r1, []);
    assert.deepStrictEqual(r2, []);

    // After settling, a manual refetch should make a fresh request
    global.fetch = async (url) => {
      requests.push(String(url));
      return jsonResponse(200, { success: true, data: [] });
    };
    await dashboardService.getNotifications({ recipientUserId: 'doc-1', unreadOnly: true });
    assert.strictEqual(requests.length, 2, 'Manual refetch after settle should trigger fresh HTTP request');
    console.log('PASS 1.2: Notification request coalescing works and preserves manual refetch');

    // Test 3: HTTP 500 on notifications MUST throw (never silently return [])
    global.fetch = async () =>
      jsonResponse(500, {
        success: false,
        statusCode: 500,
        error: 'InternalServerError',
        message: 'An internal server error occurred.',
      });
    await assert.rejects(
      () => dashboardService.getNotifications({ unreadOnly: true }),
      (err) => err instanceof ApiError && err.statusCode === 500
    );
    console.log('PASS 1.3: Notifications HTTP 500 propagates honestly as ApiError(500)');

    // Test 4: DOCTOR JWT routing for reports & recent labs (never calls /api/v1/reports)
    global.sessionStorage.setItem('careid_access_token', doctorJwt);
    requests = [];
    global.fetch = async (url) => {
      const u = String(url);
      requests.push(u);
      if (u.includes('/api/v1/doctors/patients/pat-1/medical-records')) {
        return jsonResponse(200, {
          data: [
            {
              id: 'rec-1',
              patientProfileId: 'pat-1',
              title: 'CBC Panel',
              status: 'FINAL',
              chiefComplaint: 'Routine blood count',
              createdAt: '2026-10-01T10:00:00Z',
            },
            {
              id: 'rec-2',
              patientProfileId: 'pat-1',
              title: 'Renal Metabolic Panel',
              status: 'CRITICAL',
              chiefComplaint: 'Elevated K+',
              createdAt: '2026-10-02T10:00:00Z',
            },
            {
              id: 'rec-3',
              patientProfileId: 'pat-1',
              title: 'Chest X-Ray',
              status: 'DRAFT',
              clinicalNotes: 'Pending radiologist review',
              createdAt: '2026-10-03T10:00:00Z',
            },
          ],
        });
      }
      if (u.includes('/api/v1/doctors/patients')) {
        return jsonResponse(200, {
          data: [
            { id: 'pat-1', firstName: 'Marcus', lastName: 'Doe', patientNumber: 'MRN-001', gender: 'MALE', dateOfBirth: '1985-04-12' },
          ],
        });
      }
      throw new Error(`Unexpected endpoint called for DOCTOR session: ${u}`);
    };

    // Also test StrictMode double-call coalescing on reportService.getReports()
    const [repA, repB] = await Promise.all([reportService.getReports(), reportService.getReports()]);
    assert.strictEqual(repA.source, 'doctor_records');
    assert.strictEqual(repA.reports.length, 3);
    assert.strictEqual(repB.reports.length, 3);
    assert.strictEqual(
      requests.filter((u) => u.includes('/api/v1/reports')).length,
      0,
      'DOCTOR session must NEVER hit /api/v1/reports'
    );
    assert.strictEqual(
      requests.filter((u) => u.includes('/api/v1/doctors/patients?') || u.endsWith('/api/v1/doctors/patients')).length,
      1,
      'Concurrent getReports() calls should coalesce doctor patients request'
    );
    assert.strictEqual(repA.reports[0].id, 'rec-3', 'Reports should be sorted newest-first');
    assert.strictEqual(repA.reports[0].patientName, 'Marcus Doe');
    assert.strictEqual(repA.reports[1].status, 'critical');
    assert.strictEqual(repA.reports[2].status, 'verified');

    // Verify dashboardService.getRecentLabReports maps accurately
    const labs = await dashboardService.getRecentLabReports();
    assert.strictEqual(labs.length, 3);
    assert.strictEqual(labs[0].status, 'PENDING');
    assert.strictEqual(labs[1].status, 'CRITICAL');
    assert.strictEqual(labs[1].isAbnormal, true);
    assert.strictEqual(labs[2].status, 'VERIFIED');
    console.log('PASS 1.4: DOCTOR role routes to Doctor Portal (zero /api/v1/reports 404s) and maps statuses accurately');

    // Test 5: HTTP 500 on doctor patients / medical records MUST throw honestly (never return [])
    global.fetch = async () =>
      jsonResponse(500, {
        success: false,
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Database failure',
      });
    await assert.rejects(
      () => dashboardService.getRecentLabReports(),
      (err) => err instanceof ApiError && err.statusCode === 500
    );
    console.log('PASS 1.5: Reports HTTP 500 propagates honestly as ApiError(500)');

    // Test 6: PATIENT JWT role still uses documented GET /api/v1/reports?category=...
    global.sessionStorage.setItem('careid_access_token', patientJwt);
    requests = [];
    global.fetch = async (url) => {
      requests.push(String(url));
      return jsonResponse(200, { data: [{ id: 'p-rep-1', title: 'Lipid Panel', category: 'LAB' }] });
    };
    const patientReports = await reportService.getReports({ category: 'LAB' });
    assert.strictEqual(patientReports.source, 'reports_api');
    assert(requests[0].includes('/api/v1/reports?category=LAB'), `Expected /api/v1/reports?category=LAB, got ${requests[0]}`);
    console.log('PASS 1.6: PATIENT role queries GET /api/v1/reports?category=LAB per Postman');

    // Test 7: encounters metadata mapping + getReportById demographics + pagination & no-patientId discovery
    global.sessionStorage.setItem('careid_access_token', doctorJwt);
    const { mapMedicalRecordToReport } = services;
    const mappedEncounterRec = mapMedicalRecordToReport(
      {
        id: 'enc-rec-1',
        patientProfileId: 'pat-1',
        title: 'Chest Radiograph',
        status: 'FINAL',
        encounters: [
          {
            facilityName: 'City General Hospital - Department of Radiology',
            providerName: 'Dr. Sarah Jenkins, MD',
          },
        ],
        createdAt: '2026-11-10T10:00:00Z',
        updatedAt: '2026-11-10T10:00:00Z',
      },
      'Marcus Doe',
      '+16505550004',
      'Male',
      36
    );
    assert.strictEqual(mappedEncounterRec.providerName, 'City General Hospital - Department of Radiology');
    assert.strictEqual(mappedEncounterRec.doctorName, 'Dr. Sarah Jenkins, MD');
    assert.strictEqual(mappedEncounterRec.patientName, 'Marcus Doe');
    assert.strictEqual(mappedEncounterRec.patientMrn, '+16505550004');

    const page1Items = Array.from({ length: 100 }, (_, idx) => ({
      id: `p1-${idx}`,
      patientProfileId: 'pat-1',
      title: `Record ${idx}`,
      status: 'FINAL',
      createdAt: '2026-10-01T00:00:00Z',
    }));
    requests = [];
    global.fetch = async (url) => {
      const u = String(url);
      requests.push(u);
      if (u.includes('/api/v1/doctors/patients/pat-1/medical-records') && u.includes('page=1')) {
        return jsonResponse(200, { data: page1Items });
      }
      if (u.includes('/api/v1/doctors/patients/pat-1/medical-records') && u.includes('page=2')) {
        return jsonResponse(200, {
          data: [
            {
              id: 'rec-page2',
              patientProfileId: 'pat-1',
              title: 'Critical Renal Panel',
              status: 'CRITICAL',
              encounters: [{ facilityName: 'Metro Lab', providerName: 'Dr. Jenkins' }],
              createdAt: '2026-09-01T00:00:00Z',
            },
          ],
        });
      }
      if (u.endsWith('/api/v1/doctors/patients/pat-1')) {
        return jsonResponse(200, {
          data: {
            id: 'pat-1',
            firstName: 'Marcus',
            lastName: 'Doe',
            patientNumber: '+16505550004',
            gender: 'Male',
            dateOfBirth: '1990-01-01',
          },
        });
      }
      if (u.includes('/api/v1/doctors/patients?page=1')) {
        return jsonResponse(200, { data: [{ id: 'pat-1', firstName: 'Marcus', lastName: 'Doe' }] });
      }
      if (u.includes('/api/v1/doctors/patients/pat-1/vitals') || u.includes('/insurance-cards')) {
        return jsonResponse(200, { data: [] });
      }
      throw new Error(`Unexpected URL in Test 7: ${u}`);
    };
    const detailNoPt = await reportService.getReportById('rec-page2');
    assert.strictEqual(detailNoPt.id, 'rec-page2');
    assert.strictEqual(detailNoPt.patientName, 'Marcus Doe');
    assert.strictEqual(detailNoPt.patientMrn, '+16505550004');
    assert.strictEqual(detailNoPt.patientGender, 'Male');
    assert.strictEqual(detailNoPt.providerName, 'Metro Lab');
    assert.strictEqual(detailNoPt.doctorName, 'Dr. Jenkins');
    assert.strictEqual(
      requests.filter((u) => u.includes('/appointments/doctor/me')).length,
      0,
      'getReportById without patientId should use /doctors/patients first, not /appointments/doctor/me'
    );
    console.log('PASS 1.7: getReportById resolves demographics, encounters metadata, and paginates beyond page 1');

    // Test 8: Null / 204 empty response body on notifications does not throw TypeError
    global.fetch = async () => ({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: { get: () => null },
      json: async () => {
        throw new Error('No body');
      },
      text: async () => '',
    });
    const empty204 = await dashboardService.getNotifications({ recipientUserId: 'doc-1' });
    assert.deepStrictEqual(empty204, []);
    console.log('PASS 1.8: Notifications handles HTTP 204 / null body safely');
  } finally {
    global.fetch = originalFetch;
  }
}

async function getValidDoctorToken() {
  // 1. Check .token_cache.json first and test with /api/v1/doctors/me
  if (fs.existsSync(TOKEN_CACHE_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
      if (cached.accessToken) {
        const probe = await fetch(`${API_BASE}/api/v1/doctors/me`, {
          headers: { Authorization: `Bearer ${cached.accessToken}` },
        });
        if (probe.ok) {
          return cached;
        }
      }
      if (cached.refreshToken) {
        const refRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: cached.refreshToken }),
        });
        if (refRes.ok) {
          const refJson = await refRes.json();
          const data = refJson.data || refJson;
          if (data.accessToken) {
            const updated = {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || cached.refreshToken,
              updatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(updated, null, 2));
            return updated;
          }
        }
      }
    } catch {
      // Fall through to OTP flow
    }
  }

  // 2. Request OTP once
  const reqRes = await fetch(`${API_BASE}/api/v1/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: DOCTOR_PHONE }),
  });
  const reqBody = await reqRes.json().catch(() => ({}));
  if (!reqRes.ok) {
    throw new Error(`OTP request failed (${reqRes.status}): ${JSON.stringify(reqBody)}`);
  }

  const challengeId = (reqBody.data && reqBody.data.challengeId) || reqBody.challengeId;
  if (!challengeId) {
    throw new Error(`Missing challengeId in OTP response: ${JSON.stringify(reqBody)}`);
  }

  const verRes = await fetch(`${API_BASE}/api/v1/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, otpCode: DOCTOR_OTP }),
  });
  const verBody = await verRes.json().catch(() => ({}));
  if (!verRes.ok) {
    throw new Error(`OTP verify failed (${verRes.status}): ${JSON.stringify(verBody)}`);
  }
  const tokenData = verBody.data || verBody;
  const fresh = {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(fresh, null, 2));
  return fresh;
}

async function runLiveStagingVerification(services) {
  console.log('\n=== PART 2: Live Staging Integration Verification ===');
  const { authService, dashboardService, reportService } = services;
  const tokens = await getValidDoctorToken();

  global.sessionStorage.setItem('careid_access_token', tokens.accessToken);
  if (tokens.refreshToken) {
    global.sessionStorage.setItem('careid_refresh_token', tokens.refreshToken);
  }

  const claims = authService.getJwtClaims();
  assert(claims && claims.sub, 'Doctor JWT must decode sub');
  console.log(`Authenticated Doctor sub=${claims.sub}, roles=${JSON.stringify(claims.roles)}`);

  // Spy on every live fetch call
  const originalFetch = global.fetch;
  const liveCallLog = [];
  global.fetch = async (url, init) => {
    const res = await originalFetch(url, init);
    liveCallLog.push({ method: (init && init.method) || 'GET', url: String(url), status: res.status });
    return res;
  };

  try {
    // 1. Repaired dashboardService.getNotifications (unread filtering without status=UNREAD)
    const notifications = await dashboardService.getNotifications({
      recipientUserId: claims.sub,
      unreadOnly: true,
    });
    console.log(`Live notifications result: count=${notifications.length}`);

    // 2. Repaired dashboardService.getRecentLabReports (routes Doctor to Doctor Portal)
    const labs = await dashboardService.getRecentLabReports();
    console.log(`Live recentLabs result: count=${labs.length}`);
    if (labs.length > 0) {
      console.log(`Sample lab: id=${labs[0].id}, title="${labs[0].title}", patient="${labs[0].patientName}", status=${labs[0].status}`);
    }

    // 3. Repaired reportService.getReports & getCategories
    const { reports, source } = await reportService.getReports();
    console.log(`Live reportService.getReports(): source=${source}, count=${reports.length}`);
    const categories = await reportService.getCategories();
    console.log(`Live categories: ${JSON.stringify(categories)}`);

    if (reports.length > 0) {
      const detail = await reportService.getReportById(reports[0].id, reports[0].patientProfileId);
      assert.strictEqual(detail.id, reports[0].id);
      assert(detail.patientName && detail.patientName.trim().length > 0, 'getReportById must resolve patientName');
      assert(detail.patientMrn && detail.patientMrn !== 'PT-CAREID-2026', 'getReportById must resolve authentic patientMrn');
      const detailNoPatientParam = await reportService.getReportById(reports[0].id);
      assert.strictEqual(detailNoPatientParam.id, reports[0].id);
      assert.strictEqual(detailNoPatientParam.patientName, detail.patientName);
      console.log(`Live getReportById(${reports[0].id}): OK (patient="${detail.patientName}", mrn="${detail.patientMrn}", doctor="${detail.doctorName}")`);
    }

    // Assert zero 404 or 500 calls occurred across all repaired frontend flows!
    const badCalls = liveCallLog.filter((c) => c.status >= 400);
    console.log('Live HTTP trace from repaired services:');
    for (const c of liveCallLog) {
      console.log(`  ${c.method} ${c.url} -> HTTP ${c.status}`);
    }
    assert.strictEqual(badCalls.length, 0, `Expected 0 failed HTTP calls, saw: ${JSON.stringify(badCalls)}`);
    console.log('PASS 2.1: Zero 404 / 500 HTTP calls during live staging service execution');
  } finally {
    global.fetch = originalFetch;
  }

  // Explicitly confirm the two backend bugs remain observable on raw endpoints
  const rawNotif500 = await fetch(`${API_BASE}/api/v1/notifications?status=UNREAD`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  const rawNotifBody = await rawNotif500.json().catch(() => ({}));
  console.log(`Raw backend probe GET /api/v1/notifications?status=UNREAD -> HTTP ${rawNotif500.status} ${JSON.stringify(rawNotifBody)}`);
  assert.strictEqual(rawNotif500.status, 500, 'Expected backend /notifications?status=UNREAD to return 500');

  const rawReports404 = await fetch(`${API_BASE}/api/v1/reports`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  const rawReportsBody = await rawReports404.json().catch(() => ({}));
  console.log(`Raw backend probe GET /api/v1/reports -> HTTP ${rawReports404.status} ${JSON.stringify(rawReportsBody)}`);
  assert.strictEqual(rawReports404.status, 404, 'Expected backend /reports with DOCTOR JWT to return 404');
  console.log('PASS 2.2: Confirmed raw backend 500 (status=UNREAD) and 404 (DOCTOR /reports) defects');
}

(async () => {
  try {
    const services = await bundleServices();
    await runUnitEdgeCases(services);
    await runLiveStagingVerification(services);
    console.log('\nALL VERIFICATION CHECKS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('\nVERIFICATION FAILED:', err);
    process.exit(1);
  }
})();
