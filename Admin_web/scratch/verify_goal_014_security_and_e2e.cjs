/**
 * CAREID Dynamic Clinical Practice Types & Clinical Safety Gate R1
 * Automated E2E & Security Integration Test Suite (Goal 014)
 *
 * Verifies all 15 Phase 7 integration test steps across the 4 systematic tiers:
 * - Tier 1: Feature Coverage (Catalogue CRUD, Dynamic Dropdown, Doctor Reg, Workspace Routing)
 * - Tier 2: Boundary & Corner Cases (Canonical Immutability, In-Use Constraints, Unmapped Fail-Closed)
 * - Tier 3: Cross-Feature Combinations (Dynamic Filtering, Inactive Preselection, Compatibility Mismatch)
 * - Tier 4: Real-World Scenarios (End-to-End Human/Vet Lifecycles, Cross-Domain Safety Gate R1)
 *
 * Captures genuine verification screenshots (only when target UI elements are visibly mounted) into:
 * D:\careid\Admin_web\docs\evidence\CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014\
 *
 * CLI Usage:
 *   node verify_goal_014_security_and_e2e.cjs            # Run full test suite (API + UI automation)
 *   node verify_goal_014_security_and_e2e.cjs --all      # Explicitly run full test suite
 *   node verify_goal_014_security_and_e2e.cjs --api-only # Run API & security integration tests only
 *   node verify_goal_014_security_and_e2e.cjs --ui-only  # Run Puppeteer browser UI automation only
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Dynamic Puppeteer Resolution
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e1) {
  try {
    puppeteer = require(path.resolve(__dirname, '../node_modules/puppeteer'));
  } catch (e2) {
    try {
      puppeteer = require('D:/careid/Admin_web/node_modules/puppeteer');
    } catch (e3) {
      console.warn('[WARN] Puppeteer module not found via standard requires. UI tests will require puppeteer installed.');
    }
  }
}

// Configuration Constants
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : undefined;

const EVIDENCE_DIR = path.resolve('D:\\careid\\Admin_web\\docs\\evidence\\CAREID_DYNAMIC_CLINICAL_PRACTICE_TYPES_014');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const BACKEND_BASE = 'http://localhost:3001/api/v1';
const ADMIN_WEB_BASE = 'http://localhost:5174';
const DOCTOR_WEB_BASE = 'http://localhost:5173';
const HTTP_REQUEST_TIMEOUT_MS = 15000;

// Known Test Credentials
const CREDENTIALS = {
  admin: {
    identifier: 'admin@careid.test',
    password: 'NewSecureAdminPassword123!',
    email: 'admin@careid.test',
    roles: ['ADMIN'],
  },
  humanDoctor: {
    identifier: 'dr.smith@careid.com',
    password: 'Password123!',
    email: 'dr.smith@careid.com',
    roles: ['DOCTOR'],
    clinicalPracticeType: 'HUMAN_HEALTHCARE',
    id: '058e3aa8-c9bc-467a-ba11-9946938246a3',
  },
  vetDoctor: {
    identifier: 'audit.vet.1795522697@careid.test',
    password: 'Password123!',
    email: 'audit.vet.1795522697@careid.test',
    roles: ['VETERINARIAN'],
    clinicalPracticeType: 'VETERINARY_MEDICINE',
  },
  ambiguousClinician: {
    identifier: 'unmapped.clinician.e2e@careid.test',
    password: 'Password123!',
    email: 'unmapped.clinician.e2e@careid.test',
    phone: '+16505559876',
    roles: ['DOCTOR_VET'],
  },
};

// UI Selectors Master Catalog (Strictly valid W3C CSS selectors — no Playwright :has-text pseudo-selectors)
const SELECTORS = {
  adminLogin: {
    url: `${ADMIN_WEB_BASE}/`,
    emailTab: 'button.login-tab-pill:first-child',
    emailInput: '#admin-email',
    passwordInput: '#admin-password',
    rememberMeCheckbox: '#remember-me-checkbox',
    submitButton: 'button.submit-btn[type="submit"]',
    errorBanner: 'div.auth-error-banner[role="alert"]',
    dashboardIndicator: 'aside.careid-sidebar',
  },
  settings: {
    generalUrl: `${ADMIN_WEB_BASE}/admin/settings/general`,
    practiceTypesUrl: `${ADMIN_WEB_BASE}/admin/settings/clinical-practice-types`,
    tabBar: 'nav.settings-tabs-card',
    practiceTypesTab: 'button.settings-tab-btn[data-tab="clinical-practice-types"], a[href*="clinical-practice-types"]',
    table: 'table.practice-types-table, table[data-table="clinical-practice-types"], table',
    tableRows: 'table tbody tr',
    searchInput: 'input#practice-type-search, input[placeholder*="Search practice types"], input[placeholder*="Search"]',
    statusFilter: 'select#practice-type-status-filter',
    addBtn: 'button#btn-add-practice-type, button.btn-add-practice-type',
    addModal: {
      card: 'div.practice-type-modal-card, div[role="dialog"]',
      codeInput: 'input#practice-type-code, input[name="code"]',
      displayNameInput: 'input#practice-type-display-name, input[name="displayName"]',
      descriptionTextarea: 'textarea#practice-type-description, textarea[name="description"]',
      authMappingSelect: 'select#practice-type-auth-mapping, select[name="clinicalAuthorizationMapping"]',
      submitBtn: 'button.practice-type-modal-submit[type="submit"], div[role="dialog"] button[type="submit"]',
      cancelBtn: 'button.practice-type-modal-cancel',
    },
    editRowBtn: 'button.practice-type-row-edit, button[title*="Edit"]',
    editModal: {
      card: 'div.practice-type-edit-modal-card, div[role="dialog"]',
      displayNameInput: 'input#edit-practice-type-display-name, input[name="displayName"]',
      descriptionTextarea: 'textarea#edit-practice-type-description, textarea[name="description"]',
      codeInput: 'input#edit-practice-type-code, input[name="code"]',
      submitBtn: 'button.practice-type-edit-submit[type="submit"], div[role="dialog"] button[type="submit"]',
    },
    statusToggleBtn: 'button.practice-type-row-status, button[title*="Deactivate"]',
    deactivateModal: {
      dialog: 'div.deactivate-confirmation-dialog, div[role="alertdialog"], div[role="dialog"]',
      confirmBtn: 'button.btn-confirm-deactivate',
    },
    deleteRowBtn: 'button.practice-type-row-delete, button[title*="Delete"]',
    deleteModal: {
      rejectionDialog: 'div.delete-rejection-dialog, div.action-error-toast, div[role="alertdialog"], div[role="alert"]',
      confirmBtn: 'button.btn-confirm-delete',
    },
  },
  adminAddDoctor: {
    url: `${ADMIN_WEB_BASE}/admin/doctors/create`,
    firstName: '#firstName',
    lastName: '#lastName',
    gender: '#gender',
    dob: '#dob',
    license: '#license',
    issuingBody: '#issuingBody',
    licenseExpiry: '#licenseExpiry',
    experienceYears: '#experienceYears',
    clinicalPracticeType: '#clinicalPracticeType',
    specialty: '#specialty',
    subSpecialty: '#subSpecialty',
    hospital: '#hospital',
    department: '#department',
    officeNumber: '#officeNumber',
    email: '#email',
    phone: '#phone',
    temporaryPassword: '#temporaryPassword',
    submitButton: 'button.add-doctor-submit-btn[type="submit"], button[type="submit"]',
    successSnackbar: 'div.action-success-snackbar, div[role="status"]',
  },
  adminEditDoctor: {
    profileEditBtn: 'button.doctor-profile-btn.edit',
    dialogCard: 'div.doctor-edit-dialog-card[role="dialog"], div[role="dialog"]',
    form: 'form#edit-doctor-form',
    clinicalPracticeType: 'form#edit-doctor-form select[name="clinicalPracticeType"], select[name="clinicalPracticeType"]',
    specialty: 'form#edit-doctor-form select[name="specialty"], select[name="specialty"]',
    saveBtn: 'button.doctor-edit-btn-save, button[form="edit-doctor-form"], button[type="submit"]',
    cancelBtn: 'button.doctor-edit-btn-cancel',
  },
  doctorWeb: {
    loginUrl: `${DOCTOR_WEB_BASE}/auth/login`,
    emailInput: '#auth-email-address, input[name="email"]',
    passwordInput: '#auth-password, input[name="password"]',
    phoneInput: '#auth-mobile-number',
    submitBtn: 'button[type="submit"]',
    humanDashboard: `${DOCTOR_WEB_BASE}/dashboard`,
    vetDashboard: `${DOCTOR_WEB_BASE}/veterinary/dashboard`,
    humanSidebarItems: 'aside nav a[href*="patients"], aside nav a[href*="dashboard"]',
    vetSidebarItems: 'aside nav a[href*="veterinary"], aside nav a[href*="pets"]',
    safetyGateBanner: 'span.bg-amber-100.text-amber-900',
    safetyGateTitle: 'h1',
    forbiddenBadge: 'span.bg-rose-100',
  },
};

// Utilities
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(stepNum, title, status = 'RUNNING') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'SKIP' ? '⏭️' : '⏳';
  console.log(`\n${icon} [Step ${stepNum}] ${title} (${status})`);
}

function logSubstep(message) {
  console.log(`   ➜ ${message}`);
}

/**
 * Extracts normalized lower/original message text from NestJS error response body
 */
function extractErrorMessage(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (Array.isArray(body.message)) return body.message.join('; ');
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;
  return JSON.stringify(body);
}

/**
 * Standard HTTP Request Wrapper for REST Testing (with 15s timeout)
 */
async function apiRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const client = isHttps ? https : http;

    const payload = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      Accept: 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = client.request(
      {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: method.toUpperCase(),
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let body;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch (err) {
            body = raw;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        });
      }
    );

    req.setTimeout(HTTP_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Checks whether any element matching a valid CSS selector is visible in the DOM
 */
async function isElementVisible(page, selector) {
  return page.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel));
    return els.some((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
  }, selector);
}

/**
 * Finds the first visible element matching cssSelector whose textContent includes textSubstring
 */
async function findVisibleElementByText(page, cssSelector, textSubstring) {
  const handle = await page.evaluateHandle(
    (sel, text) => {
      const target = text.toLowerCase();
      const els = Array.from(document.querySelectorAll(sel));
      return (
        els.find((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const visible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0;
          return visible && (el.textContent || '').toLowerCase().includes(target);
        }) || null
      );
    },
    cssSelector,
    textSubstring
  );
  const el = handle.asElement();
  if (!el) {
    await handle.dispose().catch(() => {});
    return null;
  }
  return el;
}

/**
 * Finds an element by primary CSS selector, or falls back to text-based DOM lookup
 */
async function findElementWithFallback(page, cssSelector, fallbackCss, fallbackText) {
  if (cssSelector) {
    const els = await page.$$(cssSelector);
    for (const el of els) {
      const visible = await el.evaluate((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      });
      if (visible) return el;
    }
  }
  if (fallbackCss && fallbackText) {
    return findVisibleElementByText(page, fallbackCss, fallbackText);
  }
  return null;
}

/**
 * Safely sets value on React 18 controlled inputs (date inputs, text inputs)
 */
async function setReactInputValue(page, selector, value) {
  await page.waitForSelector(selector, { visible: true, timeout: 5000 });
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Element not found: ${sel}`);
      const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    selector,
    value
  );
}

/**
 * Waits for a <select> element to populate with options dynamically from TanStack Query
 */
async function waitForSelectOptions(page, selector, minOptions = 2, timeout = 10000) {
  await page.waitForSelector(selector, { visible: true, timeout });
  await page.waitForFunction(
    (sel, min) => {
      const el = document.querySelector(sel);
      return el && !el.disabled && el.options && el.options.length >= min;
    },
    { timeout },
    selector,
    minOptions
  );
}

/**
 * Selects an option in a dynamic select and dispatches standard change events for React Hook Form
 */
async function selectOptionAndNotify(page, selector, value) {
  await page.waitForSelector(selector, { visible: true });
  await page.select(selector, value);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, selector);
}

/**
 * Injects authenticated Admin session into browser localStorage
 */
async function injectAdminSession(page, token, email = 'admin@careid.test', roles = ['ADMIN']) {
  await page.goto(`${ADMIN_WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (tok, mail, r) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', tok);
      localStorage.setItem('careid_token', tok);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem(
        'careid_user_session',
        JSON.stringify({
          id: '55332dd3-139c-4122-a566-ae1b30a2bab6',
          email: mail,
          roles: r,
        })
      );
    },
    token,
    email,
    roles
  );
}

/**
 * Injects Doctor session into browser sessionStorage (careid_user_profile_cache & tokens) and localStorage
 */
async function injectDoctorSession(page, token, user) {
  await page.goto(`${DOCTOR_WEB_BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (tok, u) => {
      sessionStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_refresh_token', tok);
      sessionStorage.setItem('careid_user_profile_cache', JSON.stringify(u));
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', tok);
      localStorage.setItem('auth_token', tok);
      localStorage.setItem('accessToken', tok);
      localStorage.setItem('user', JSON.stringify(u));
    },
    token,
    user
  );
}

/**
 * Captures verification screenshot to target evidence path
 */
async function captureScreenshot(page, filename, description) {
  const fullPath = path.join(EVIDENCE_DIR, filename);
  try {
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`   📸 [Screenshot Captured] ${filename} - ${description}`);
    return true;
  } catch (err) {
    console.warn(`   ⚠️ [Screenshot Warning] Failed to capture ${filename}: ${err.message}`);
    return false;
  }
}

// ==============================================================================
// TEST SUITE RUNNER
// ==============================================================================

async function runTestSuite() {
  const args = process.argv.slice(2);
  const apiOnly = args.includes('--api-only');
  const uiOnly = args.includes('--ui-only');

  console.log('================================================================');
  console.log('CAREID DYNAMIC CLINICAL PRACTICE TYPES & SAFETY GATE R1 (GOAL 014)');
  console.log('Comprehensive E2E & Security Integration Test Suite');
  console.log('================================================================');
  console.log(`Execution Mode: ${apiOnly ? 'API ONLY' : uiOnly ? 'UI ONLY' : 'FULL (API + UI)'}`);
  console.log(`Evidence Directory: ${EVIDENCE_DIR}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = {
    total: 15,
    passed: 0,
    failed: 0,
    skipped: 0,
    steps: {},
    screenshots: [],
    errors: [],
  };

  let adminToken = null;
  let humanDoctorToken = null;
  let vetDoctorToken = null;

  let createdCustomTypeId = null;
  let inUseCustomTypeId = null;
  const customTypeCode = `TEST_OPHTHALMOLOGY_${Date.now() % 100000}`;

  // Shared registration results populated by API Steps 9 & 11 for optional UI consumption
  let registeredHumanDoctor = null;
  let registeredVetDoctor = null;

  // Helper to record step results
  function recordStep(stepNumber, name, passed, details = null) {
    if (passed) {
      results.passed++;
      results.steps[stepNumber] = { name, status: 'PASS', details };
      logStep(stepNumber, name, 'PASS');
    } else {
      results.failed++;
      results.steps[stepNumber] = { name, status: 'FAIL', details };
      logStep(stepNumber, name, 'FAIL');
      if (details) results.errors.push(`Step ${stepNumber} (${name}): ${details}`);
    }
  }

  // --------------------------------------------------------------------------
  // 0. AUTHENTICATION PRE-REQUISITES (Run unconditionally for all modes)
  // --------------------------------------------------------------------------
  console.log('--- Phase 0: Authenticating Test Principals ---');
  try {
    // 1. Admin Login
    const adminLogin = await apiRequest('POST', `${BACKEND_BASE}/auth/password/login`, {
      identifier: CREDENTIALS.admin.identifier,
      password: CREDENTIALS.admin.password,
    });
    if (adminLogin.status === 200 && adminLogin.body?.data?.accessToken) {
      adminToken = adminLogin.body.data.accessToken;
      logSubstep(`Admin Authenticated (${CREDENTIALS.admin.identifier})`);
    } else {
      throw new Error(`Admin login failed: ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`);
    }

    // 2. Human Doctor Login
    const docLogin = await apiRequest('POST', `${BACKEND_BASE}/auth/password/login`, {
      identifier: CREDENTIALS.humanDoctor.identifier,
      password: CREDENTIALS.humanDoctor.password,
    });
    if (docLogin.status === 200 && docLogin.body?.data?.accessToken) {
      humanDoctorToken = docLogin.body.data.accessToken;
      logSubstep(`Human Doctor Authenticated (${CREDENTIALS.humanDoctor.identifier})`);
    } else {
      throw new Error(`Human Doctor login failed: ${docLogin.status} ${JSON.stringify(docLogin.body)}`);
    }

    // 3. Vet Doctor Login
    const vetLogin = await apiRequest('POST', `${BACKEND_BASE}/auth/password/login`, {
      identifier: CREDENTIALS.vetDoctor.identifier,
      password: CREDENTIALS.vetDoctor.password,
    });
    if (vetLogin.status === 200 && vetLogin.body?.data?.accessToken) {
      vetDoctorToken = vetLogin.body.data.accessToken;
      logSubstep(`Veterinary Doctor Authenticated (${CREDENTIALS.vetDoctor.identifier})`);
    } else {
      throw new Error(`Vet Doctor login failed: ${vetLogin.status} ${JSON.stringify(vetLogin.body)}`);
    }
  } catch (authErr) {
    console.error(`❌ Authentication Phase Error: ${authErr.message}`);
    results.failed++;
    results.errors.push(`Auth Phase: ${authErr.message}`);
  }

  // ==========================================================================
  // API INTEGRATION TESTS (Steps 1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 14, 15)
  // ==========================================================================
  if (!uiOnly && !adminToken) {
    results.failed++;
    results.errors.push('API Integration Phase aborted: Admin authentication token missing');
  } else if (!uiOnly && adminToken) {
    console.log('\n================================================================');
    console.log('EXECUTING BACKEND API & SECURITY CONTRACT VALIDATIONS');
    console.log('================================================================');

    // --- STEP 1: Dynamic Catalogue Loading API ---
    try {
      logStep(1, 'Dynamic Catalogue Loading (GET /api/v1/clinical-practice-types)');
      const res = await apiRequest('GET', `${BACKEND_BASE}/clinical-practice-types`, null, {
        Authorization: `Bearer ${adminToken}`,
      });

      const is200 = res.status === 200;
      const data = res.body?.data || [];
      const hasCanonicalHuman = data.some((item) => item.code === 'HUMAN_HEALTHCARE' && item.isCanonical === true);
      const hasCanonicalVet = data.some((item) => item.code === 'VETERINARY_MEDICINE' && item.isCanonical === true);
      const onlyActive = data.every((item) => item.status === 'ACTIVE');

      logSubstep(`Status: ${res.status}, Count: ${data.length}`);
      logSubstep(`Canonical HUMAN_HEALTHCARE present: ${hasCanonicalHuman}`);
      logSubstep(`Canonical VETERINARY_MEDICINE present: ${hasCanonicalVet}`);
      logSubstep(`All returned items status ACTIVE: ${onlyActive}`);

      recordStep(
        1,
        'Dynamic Catalogue Loading',
        is200 && data.length >= 2 && hasCanonicalHuman && hasCanonicalVet && onlyActive,
        is200 ? 'Active types loaded dynamically' : `Unexpected status: ${res.status}`
      );
    } catch (e) {
      recordStep(1, 'Dynamic Catalogue Loading', false, e.message);
    }

    // --- STEP 2: Catalogue Management Listing API ---
    try {
      logStep(2, 'Catalogue Management Listing (GET /api/v1/admin/clinical-practice-types)');
      const res = await apiRequest('GET', `${BACKEND_BASE}/admin/clinical-practice-types`, null, {
        Authorization: `Bearer ${adminToken}`,
      });

      const is200 = res.status === 200;
      const data = res.body?.data || [];
      const hasCounts = data.some((item) => item._count && typeof item._count.doctors === 'number');

      // Test search filter
      const searchRes = await apiRequest(
        'GET',
        `${BACKEND_BASE}/admin/clinical-practice-types?search=Healthcare`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      const searchMatches = (searchRes.body?.data || []).some((i) => i.code === 'HUMAN_HEALTHCARE');

      logSubstep(`Status: ${res.status}, Total Entries: ${data.length}, Includes _count: ${hasCounts}`);
      logSubstep(`Search 'Healthcare' returned matches: ${searchMatches}`);

      recordStep(
        2,
        'Catalogue Management Listing',
        is200 && data.length >= 2 && hasCounts && searchMatches,
        `Returned ${data.length} practice types with counts and search filter supported`
      );
    } catch (e) {
      recordStep(2, 'Catalogue Management Listing', false, e.message);
    }

    // --- STEP 3: Add Practice Type API ---
    try {
      logStep(3, 'Add Practice Type (POST /api/v1/admin/clinical-practice-types)');
      const newTypePayload = {
        code: customTypeCode,
        displayName: 'Ophthalmic Surgery & Diagnostics',
        description: 'Comprehensive ophthalmology and vitreo-retinal surgery',
        clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
        status: 'ACTIVE',
        sortOrder: 10,
      };

      const res = await apiRequest('POST', `${BACKEND_BASE}/admin/clinical-practice-types`, newTypePayload, {
        Authorization: `Bearer ${adminToken}`,
      });

      const is201 = res.status === 201;
      createdCustomTypeId = res.body?.data?.id;
      logSubstep(`Create Status: ${res.status}, Created ID: ${createdCustomTypeId}`);

      // Test duplicate code rejection (409 Conflict or 400 Bad Request)
      const dupRes = await apiRequest('POST', `${BACKEND_BASE}/admin/clinical-practice-types`, newTypePayload, {
        Authorization: `Bearer ${adminToken}`,
      });
      const isDuplicateRejected = dupRes.status === 409 || dupRes.status === 400;
      logSubstep(`Duplicate Code Submission Status: ${dupRes.status} (Expected 409/400)`);

      recordStep(
        3,
        'Add Practice Type',
        is201 && Boolean(createdCustomTypeId) && isDuplicateRejected,
        `Created type '${customTypeCode}' (ID: ${createdCustomTypeId}) and rejected duplicate with ${dupRes.status}`
      );
    } catch (e) {
      recordStep(3, 'Add Practice Type', false, e.message);
    }

    // --- STEP 4: Edit Practice Type API ---
    try {
      logStep(4, 'Edit Practice Type (PUT /api/v1/admin/clinical-practice-types/:id)');
      if (!createdCustomTypeId) throw new Error('No custom practice type ID available from Step 3');

      const updatePayload = {
        displayName: 'Advanced Ophthalmic Surgery & Retinal Care',
        description: 'Updated comprehensive ophthalmology service description',
      };

      const res = await apiRequest(
        'PUT',
        `${BACKEND_BASE}/admin/clinical-practice-types/${createdCustomTypeId}`,
        updatePayload,
        { Authorization: `Bearer ${adminToken}` }
      );

      const is200 = res.status === 200;
      const updatedName = res.body?.data?.displayName;
      logSubstep(`Update Status: ${res.status}, DisplayName: '${updatedName}'`);

      recordStep(
        4,
        'Edit Practice Type',
        is200 && updatedName === updatePayload.displayName,
        `Updated displayName to '${updatedName}'`
      );
    } catch (e) {
      recordStep(4, 'Edit Practice Type', false, e.message);
    }

    // --- STEP 5: Activate / Deactivate Toggle API ---
    try {
      logStep(5, 'Activate / Deactivate Toggle (PATCH /api/v1/admin/clinical-practice-types/:id/status)');
      if (!createdCustomTypeId) throw new Error('No custom practice type ID available from Step 3');

      // 1. Deactivate
      const deactRes = await apiRequest(
        'PATCH',
        `${BACKEND_BASE}/admin/clinical-practice-types/${createdCustomTypeId}/status`,
        { status: 'INACTIVE' },
        { Authorization: `Bearer ${adminToken}` }
      );
      const isDeactivated = deactRes.status === 200 && deactRes.body?.data?.status === 'INACTIVE';
      logSubstep(`Deactivate Status: ${deactRes.status}, Status: ${deactRes.body?.data?.status}`);

      // Verify excluded from public dropdown
      const publicDropdown = await apiRequest('GET', `${BACKEND_BASE}/clinical-practice-types`, null, {
        Authorization: `Bearer ${adminToken}`,
      });
      const excludedFromDropdown = !(publicDropdown.body?.data || []).some((i) => i.id === createdCustomTypeId);
      logSubstep(`Inactive type successfully omitted from active dropdown: ${excludedFromDropdown}`);

      // 2. Reactivate
      const reactRes = await apiRequest(
        'PATCH',
        `${BACKEND_BASE}/admin/clinical-practice-types/${createdCustomTypeId}/status`,
        { status: 'ACTIVE' },
        { Authorization: `Bearer ${adminToken}` }
      );
      const isReactivated = reactRes.status === 200 && reactRes.body?.data?.status === 'ACTIVE';
      logSubstep(`Reactivate Status: ${reactRes.status}, Status: ${reactRes.body?.data?.status}`);

      recordStep(
        5,
        'Activate / Deactivate Toggle',
        isDeactivated && excludedFromDropdown && isReactivated,
        `Status successfully toggled ACTIVE -> INACTIVE -> ACTIVE`
      );
    } catch (e) {
      recordStep(5, 'Activate / Deactivate Toggle', false, e.message);
    }

    // --- STEP 6: In-Use & Canonical Deletion Rejection API ---
    try {
      logStep(6, 'In-Use & Canonical Deletion Rejection (DELETE /api/v1/admin/clinical-practice-types/:id)');

      // 1. Canonical practice type deletion -> Expected 400 Bad Request
      const listRes = await apiRequest('GET', `${BACKEND_BASE}/admin/clinical-practice-types`, null, {
        Authorization: `Bearer ${adminToken}`,
      });
      const humanType = (listRes.body?.data || []).find((i) => i.code === 'HUMAN_HEALTHCARE');
      if (!humanType) throw new Error('HUMAN_HEALTHCARE practice type not found in database');

      const canonicalDelRes = await apiRequest(
        'DELETE',
        `${BACKEND_BASE}/admin/clinical-practice-types/${humanType.id}`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      const canonicalMsg = extractErrorMessage(canonicalDelRes.body).toLowerCase();
      const canonicalRejected400 = canonicalDelRes.status === 400 && canonicalMsg.includes('canonical');
      logSubstep(`Canonical Delete Status: ${canonicalDelRes.status} (Expected 400), Message: ${extractErrorMessage(canonicalDelRes.body)}`);

      // 2. Custom practice type assigned to a doctor -> Expected 409 Conflict
      const suffix = `${Date.now() % 100000}${Math.floor(10 + Math.random() * 89)}`;
      const inUseCode = `IN_USE_TEST_${suffix}`;
      const createInUseRes = await apiRequest(
        'POST',
        `${BACKEND_BASE}/admin/clinical-practice-types`,
        {
          code: inUseCode,
          displayName: 'In-Use Referential Test Practice',
          description: 'Synthetic practice type assigned to a doctor to verify 409 Conflict deletion guard',
          clinicalAuthorizationMapping: 'HUMAN_HEALTHCARE',
          status: 'ACTIVE',
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      if (createInUseRes.status !== 201 || !createInUseRes.body?.data?.id) {
        throw new Error(`Failed to create synthetic in-use practice type: ${createInUseRes.status} ${extractErrorMessage(createInUseRes.body)}`);
      }
      inUseCustomTypeId = createInUseRes.body.data.id;

      // Assign synthetic doctor to this custom practice type
      const assignDocRes = await apiRequest(
        'POST',
        `${BACKEND_BASE}/admin/users`,
        {
          phone: `+1888${Date.now().toString().slice(-7)}`,
          email: `dr.inuse.${suffix}@careid.test`,
          fullName: 'Dr. In-Use Practice Guard',
          role: 'DOCTOR',
          clinicalPracticeType: inUseCode,
          primarySpecialization: 'Ophthalmic Diagnostics',
          licenseNumber: `LIC-INUSE-${suffix}`,
          medicalCouncil: 'Medical Council of Test',
          registrationNumber: `REG-INUSE-${suffix}`,
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      if (assignDocRes.status !== 201) {
        throw new Error(`Failed to assign doctor to custom practice type: ${assignDocRes.status} ${extractErrorMessage(assignDocRes.body)}`);
      }

      // Attempt to delete the custom practice type now assigned to the doctor -> Expected 409 Conflict
      const inUseDelRes = await apiRequest(
        'DELETE',
        `${BACKEND_BASE}/admin/clinical-practice-types/${inUseCustomTypeId}`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      const inUseMsg = extractErrorMessage(inUseDelRes.body).toLowerCase();
      const inUseRejected409 =
        inUseDelRes.status === 409 &&
        (inUseMsg.includes('assigned') || inUseMsg.includes('doctor') || inUseMsg.includes('specialty'));
      logSubstep(`In-Use Custom Type Delete Status: ${inUseDelRes.status} (Expected 409), Message: ${extractErrorMessage(inUseDelRes.body)}`);

      recordStep(
        6,
        'In-Use Deletion Rejection',
        canonicalRejected400 && inUseRejected409,
        `Canonical rejected (${canonicalDelRes.status} Bad Request) and in-use custom type rejected (${inUseDelRes.status} Conflict)`
      );
    } catch (e) {
      recordStep(6, 'In-Use Deletion Rejection', false, e.message);
    }

    // --- STEP 7: Canonical Protection API ---
    try {
      logStep(7, 'Canonical Protection (HUMAN_HEALTHCARE & VETERINARY_MEDICINE)');
      const listRes = await apiRequest('GET', `${BACKEND_BASE}/admin/clinical-practice-types`, null, {
        Authorization: `Bearer ${adminToken}`,
      });
      const humanType = (listRes.body?.data || []).find((i) => i.code === 'HUMAN_HEALTHCARE');
      const vetType = (listRes.body?.data || []).find((i) => i.code === 'VETERINARY_MEDICINE');
      if (!humanType || !vetType) throw new Error('Canonical practice types missing from catalogue');

      // 1. Attempt to deactivate canonical type -> must reject 400
      const deactHuman = await apiRequest(
        'PATCH',
        `${BACKEND_BASE}/admin/clinical-practice-types/${humanType.id}/status`,
        { status: 'INACTIVE' },
        { Authorization: `Bearer ${adminToken}` }
      );
      const humanDeactRejected = deactHuman.status === 400;
      logSubstep(`Canonical Human Deactivate Status: ${deactHuman.status} (Expected 400)`);

      // 2. Attempt to mutate code or authorization mapping on canonical type -> must reject 400
      const mutateHuman = await apiRequest(
        'PUT',
        `${BACKEND_BASE}/admin/clinical-practice-types/${humanType.id}`,
        { clinicalAuthorizationMapping: 'VETERINARY_MEDICINE' },
        { Authorization: `Bearer ${adminToken}` }
      );
      const humanMutateRejected = mutateHuman.status === 400;
      logSubstep(`Canonical Human Semantic Reassignment Status: ${mutateHuman.status} (Expected 400)`);

      // 3. Attempt to delete canonical vet type -> must reject 400
      const delVet = await apiRequest('DELETE', `${BACKEND_BASE}/admin/clinical-practice-types/${vetType.id}`, null, {
        Authorization: `Bearer ${adminToken}`,
      });
      const vetDelRejected = delVet.status === 400;
      logSubstep(`Canonical Vet Delete Status: ${delVet.status} (Expected 400)`);

      recordStep(
        7,
        'Canonical Protection',
        humanDeactRejected && humanMutateRejected && vetDelRejected,
        `Canonical classifications protected from deactivation, deletion, and reassignment`
      );
    } catch (e) {
      recordStep(7, 'Canonical Protection', false, e.message);
    }

    // --- STEP 9: Human Doctor Registration (API Validation & Persistence) ---
    try {
      logStep(9, 'Human Doctor Registration (POST /api/v1/admin/users with HUMAN_HEALTHCARE)');
      const uniq = `${Date.now() % 100000}${Math.floor(10 + Math.random() * 89)}`;
      const humanDocPayload = {
        phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
        email: `dr.human.reg.${uniq}@careid.test`,
        password: 'Password123!',
        fullName: 'Dr. Human Registered E2E',
        role: 'DOCTOR',
        clinicalPracticeType: 'HUMAN_HEALTHCARE',
        primarySpecialization: 'Cardiology',
        licenseNumber: `LIC-HUMAN-${uniq}`,
        medicalCouncil: 'Medical Council of California',
        registrationNumber: `REG-HUMAN-${uniq}`,
      };
      const regHumanRes = await apiRequest('POST', `${BACKEND_BASE}/admin/users`, humanDocPayload, {
        Authorization: `Bearer ${adminToken}`,
      });
      const createdUser = regHumanRes.body?.data;
      const isHumanRegOk =
        regHumanRes.status === 201 &&
        Array.isArray(createdUser?.roles) &&
        createdUser.roles.includes('DOCTOR') &&
        Boolean(createdUser?.doctorProfileId);

      let persistedPracticeType = null;
      if (createdUser?.doctorProfileId) {
        const docProfileRes = await apiRequest(
          'GET',
          `${BACKEND_BASE}/doctors/${createdUser.doctorProfileId}`,
          null,
          { Authorization: `Bearer ${adminToken}` }
        );
        persistedPracticeType = docProfileRes.body?.data?.clinicalPracticeType;
        registeredHumanDoctor = {
          userId: createdUser.id,
          doctorProfileId: createdUser.doctorProfileId,
          email: humanDocPayload.email,
          password: humanDocPayload.password,
          roles: createdUser.roles,
          clinicalPracticeType: persistedPracticeType,
        };
      }

      logSubstep(
        `Register Human Doctor Status: ${regHumanRes.status}, Roles: ${JSON.stringify(createdUser?.roles)}, PracticeType: ${persistedPracticeType}`
      );
      recordStep(
        9,
        'Human Doctor Registration',
        isHumanRegOk && persistedPracticeType === 'HUMAN_HEALTHCARE',
        `Registered Human Doctor (ID: ${createdUser?.doctorProfileId}) with role DOCTOR and HUMAN_HEALTHCARE`
      );
    } catch (e) {
      recordStep(9, 'Human Doctor Registration', false, e.message);
    }

    // --- STEP 11: Veterinary Doctor Registration (API Validation & Persistence) ---
    try {
      logStep(11, 'Veterinary Doctor Registration (POST /api/v1/admin/users with VETERINARY_MEDICINE)');
      const uniq = `${Date.now() % 100000}${Math.floor(10 + Math.random() * 89)}`;
      const vetDocPayload = {
        phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
        email: `dr.vet.reg.${uniq}@careid.test`,
        password: 'Password123!',
        fullName: 'Dr. Veterinary Registered E2E',
        role: 'VETERINARIAN',
        clinicalPracticeType: 'VETERINARY_MEDICINE',
        primarySpecialization: 'Veterinary Medicine',
        licenseNumber: `LIC-VET-${uniq}`,
        medicalCouncil: 'Veterinary Medical Board',
        registrationNumber: `REG-VET-${uniq}`,
      };
      const regVetRes = await apiRequest('POST', `${BACKEND_BASE}/admin/users`, vetDocPayload, {
        Authorization: `Bearer ${adminToken}`,
      });
      const createdVetUser = regVetRes.body?.data;
      const isVetRegOk =
        regVetRes.status === 201 &&
        Array.isArray(createdVetUser?.roles) &&
        createdVetUser.roles.includes('VETERINARIAN') &&
        Boolean(createdVetUser?.doctorProfileId);

      let persistedPracticeType = null;
      if (createdVetUser?.doctorProfileId) {
        const docProfileRes = await apiRequest(
          'GET',
          `${BACKEND_BASE}/doctors/${createdVetUser.doctorProfileId}`,
          null,
          { Authorization: `Bearer ${adminToken}` }
        );
        persistedPracticeType = docProfileRes.body?.data?.clinicalPracticeType;
        registeredVetDoctor = {
          userId: createdVetUser.id,
          doctorProfileId: createdVetUser.doctorProfileId,
          email: vetDocPayload.email,
          password: vetDocPayload.password,
          roles: createdVetUser.roles,
          clinicalPracticeType: persistedPracticeType,
        };
      }

      logSubstep(
        `Register Veterinary Doctor Status: ${regVetRes.status}, Roles: ${JSON.stringify(createdVetUser?.roles)}, PracticeType: ${persistedPracticeType}`
      );
      recordStep(
        11,
        'Veterinary Doctor Registration',
        isVetRegOk && persistedPracticeType === 'VETERINARY_MEDICINE',
        `Registered Vet Doctor (ID: ${createdVetUser?.doctorProfileId}) with role VETERINARIAN and VETERINARY_MEDICINE`
      );
    } catch (e) {
      recordStep(11, 'Veterinary Doctor Registration', false, e.message);
    }

    // --- STEP 13: Dynamic Specialty Filtering API ---
    try {
      logStep(13, 'Dynamic Specialty Filtering (GET /api/v1/doctors/specialties?practiceType=...)');

      // 1. Human specialties
      const humanSpecRes = await apiRequest(
        'GET',
        `${BACKEND_BASE}/doctors/specialties?practiceType=HUMAN_HEALTHCARE`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      const humanSpecs = humanSpecRes.body?.data || [];
      const allHuman = humanSpecs.every((s) => s.clinicalPracticeType === 'HUMAN_HEALTHCARE');
      const noVetInHuman = !humanSpecs.some((s) => s.code === 'VETERINARY_MEDICINE' || s.name === 'Veterinary Medicine');

      // 2. Vet specialties
      const vetSpecRes = await apiRequest(
        'GET',
        `${BACKEND_BASE}/doctors/specialties?practiceType=VETERINARY_MEDICINE`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      const vetSpecs = vetSpecRes.body?.data || [];
      const hasVetSpec = vetSpecs.some((s) => s.code === 'VETERINARY_MEDICINE' || s.name === 'Veterinary Medicine');
      const noHumanInVet = !vetSpecs.some((s) => s.name === 'Cardiology' || s.name === 'Pediatrics');

      logSubstep(`Human Specialties Count: ${humanSpecs.length}, All Human: ${allHuman}, No Vet: ${noVetInHuman}`);
      logSubstep(`Vet Specialties Count: ${vetSpecs.length}, Contains Vet: ${hasVetSpec}, No Human: ${noHumanInVet}`);

      recordStep(
        13,
        'Dynamic Specialty Filtering',
        humanSpecRes.status === 200 &&
          vetSpecRes.status === 200 &&
          humanSpecs.length >= 12 &&
          allHuman &&
          noVetInHuman &&
          vetSpecs.length >= 1 &&
          hasVetSpec &&
          noHumanInVet,
        `Filtered specialties match clinicalPracticeType (${humanSpecs.length} human vs ${vetSpecs.length} vet)`
      );
    } catch (e) {
      recordStep(13, 'Dynamic Specialty Filtering', false, e.message);
    }

    // --- STEP 14: Specialty Compatibility Validation API ---
    try {
      logStep(14, 'Specialty Compatibility Validation (POST /api/v1/admin/users Mismatch Rejection)');

      // 1. Human Doctor + Vet Specialty -> Expected 400 Bad Request
      const mismatchHuman = await apiRequest(
        'POST',
        `${BACKEND_BASE}/admin/users`,
        {
          phone: `+1888${Date.now().toString().slice(-7)}`,
          email: `mismatch.human.${Date.now()}@careid.test`,
          fullName: 'Dr. Test Mismatch Human',
          role: 'DOCTOR',
          clinicalPracticeType: 'HUMAN_HEALTHCARE',
          primarySpecialization: 'Veterinary Medicine',
          licenseNumber: `LIC-MISMATCH-${Date.now() % 10000}`,
          medicalCouncil: 'Medical Council of Test',
          registrationNumber: `REG-MISMATCH-${Date.now() % 10000}`,
        },
        { Authorization: `Bearer ${adminToken}` }
      );

      const humanErrText = extractErrorMessage(mismatchHuman.body).toLowerCase();
      const humanMismatchRejected =
        mismatchHuman.status === 400 &&
        (humanErrText.includes('specialization is not compatible with selected clinical practice type') ||
          humanErrText.includes('veterinary specialization is not permitted'));
      logSubstep(`Human Doctor + Vet Specialty Status: ${mismatchHuman.status} (Expected 400)`);
      logSubstep(`Message: ${extractErrorMessage(mismatchHuman.body)}`);

      // 2. Vet Doctor + Human Specialty -> Expected 400 Bad Request
      const mismatchVet = await apiRequest(
        'POST',
        `${BACKEND_BASE}/admin/users`,
        {
          phone: `+1888${Date.now().toString().slice(-7)}`,
          email: `mismatch.vet.${Date.now()}@careid.test`,
          fullName: 'Dr. Test Mismatch Vet',
          role: 'VETERINARIAN',
          clinicalPracticeType: 'VETERINARY_MEDICINE',
          primarySpecialization: 'Cardiology',
          licenseNumber: `LIC-MISMATCH-VET-${Date.now() % 10000}`,
          medicalCouncil: 'Veterinary Council of Test',
          registrationNumber: `REG-MISMATCH-VET-${Date.now() % 10000}`,
        },
        { Authorization: `Bearer ${adminToken}` }
      );

      const vetErrText = extractErrorMessage(mismatchVet.body).toLowerCase();
      const vetMismatchRejected =
        mismatchVet.status === 400 &&
        (vetErrText.includes('specialization is not compatible with selected clinical practice type') ||
          vetErrText.includes('human medical specialization is not permitted'));
      logSubstep(`Vet Doctor + Human Specialty Status: ${mismatchVet.status} (Expected 400)`);
      logSubstep(`Message: ${extractErrorMessage(mismatchVet.body)}`);

      recordStep(
        14,
        'Specialty Compatibility Validation',
        humanMismatchRejected && vetMismatchRejected,
        `Mismatched specialties strictly rejected with HTTP 400 Bad Request`
      );
    } catch (e) {
      recordStep(14, 'Specialty Compatibility Validation', false, e.message);
    }

    // --- STEP 15: Security & Safety Gate R1 Assertion API ---
    try {
      logStep(15, 'Security & Safety Gate R1 Assertion (RBAC & Cross-Domain Isolation)');

      // 1. Unauthenticated catalogue call -> 401
      const unauthRes = await apiRequest('GET', `${BACKEND_BASE}/admin/clinical-practice-types`);
      const is401 = unauthRes.status === 401;
      logSubstep(`Unauthenticated Admin Call Status: ${unauthRes.status} (Expected 401)`);

      // 2. Doctor token calling admin catalogue -> 403 + RBAC explanation
      let isDocBlocked = false;
      if (humanDoctorToken) {
        const docAdminRes = await apiRequest('GET', `${BACKEND_BASE}/admin/clinical-practice-types`, null, {
          Authorization: `Bearer ${humanDoctorToken}`,
        });
        const docAdminMsg = extractErrorMessage(docAdminRes.body);
        isDocBlocked =
          docAdminRes.status === 403 &&
          /forbidden|not authorized|permission|access denied|insufficient/i.test(docAdminMsg);
        logSubstep(`Doctor Calling Admin Catalogue Status: ${docAdminRes.status}, Message: "${docAdminMsg}"`);
      }

      // 3. Human Doctor calling veterinary records (/doctors/pets) -> 403 + clinical safety explanation
      let isHumanPetBlocked = false;
      if (humanDoctorToken) {
        const humanPetRes = await apiRequest('GET', `${BACKEND_BASE}/doctors/pets`, null, {
          Authorization: `Bearer ${humanDoctorToken}`,
        });
        const humanPetMsg = extractErrorMessage(humanPetRes.body);
        isHumanPetBlocked =
          humanPetRes.status === 403 &&
          /veterinary/i.test(humanPetMsg) &&
          /denied|not authorized|accreditation/i.test(humanPetMsg);
        logSubstep(`Human Doctor Accessing Pet Records Status: ${humanPetRes.status}, Message: "${humanPetMsg}"`);
      }

      // 4. Veterinary Doctor calling human records (/doctors/patients) -> 403 + clinical safety / role guard explanation
      let isVetPatientBlocked = false;
      if (vetDoctorToken) {
        const vetPatientRes = await apiRequest('GET', `${BACKEND_BASE}/doctors/patients`, null, {
          Authorization: `Bearer ${vetDoctorToken}`,
        });
        const vetPatientMsg = extractErrorMessage(vetPatientRes.body);
        isVetPatientBlocked =
          vetPatientRes.status === 403 &&
          /forbidden|access denied|not authorized|human patient|veterinarians/i.test(vetPatientMsg);
        logSubstep(`Veterinary Doctor Accessing Human Patients Status: ${vetPatientRes.status}, Message: "${vetPatientMsg}"`);
      }

      // 5. Doctor attempting self-edit of clinicalPracticeType via PUT /doctors/:id -> 403 + scope lockdown explanation
      let isSelfEditBlocked = false;
      if (humanDoctorToken) {
        const selfEditRes = await apiRequest(
          'PUT',
          `${BACKEND_BASE}/doctors/${CREDENTIALS.humanDoctor.id}`,
          { clinicalPracticeType: 'VETERINARY_MEDICINE' },
          { Authorization: `Bearer ${humanDoctorToken}` }
        );
        const selfEditMsg = extractErrorMessage(selfEditRes.body);
        isSelfEditBlocked =
          selfEditRes.status === 403 &&
          /clinical practice type|authorization scope|strictly prohibited/i.test(selfEditMsg);
        logSubstep(`Doctor Self-Edit Scope Alteration Status: ${selfEditRes.status}, Message: "${selfEditMsg}"`);
      }

      // 6. Unmapped practice type cannot escalate to clinical doctor role (fail-closed -> STAFF)
      let isUnmappedFailClosedApi = false;
      const unmappedCode = `UNMAPPED_RES_${Date.now() % 100000}`;
      const unmappedTypeRes = await apiRequest(
        'POST',
        `${BACKEND_BASE}/admin/clinical-practice-types`,
        {
          code: unmappedCode,
          displayName: 'Unmapped Clinical Research',
          description: 'Non-clinical research scope without human/vet mapping',
          clinicalAuthorizationMapping: 'UNMAPPED',
          status: 'ACTIVE',
        },
        { Authorization: `Bearer ${adminToken}` }
      );
      if (unmappedTypeRes.status === 201 && unmappedTypeRes.body?.data?.id) {
        const unmappedTypeId = unmappedTypeRes.body.data.id;
        const unmappedUserRes = await apiRequest(
          'POST',
          `${BACKEND_BASE}/admin/users`,
          {
            phone: `+1888${Date.now().toString().slice(-7)}`,
            email: `unmapped.staff.${Date.now()}@careid.test`,
            fullName: 'Dr. Unmapped Non-Clinical',
            role: 'DOCTOR',
            clinicalPracticeType: unmappedCode,
          },
          { Authorization: `Bearer ${adminToken}` }
        );
        const assignedRoles = unmappedUserRes.body?.data?.roles || [];
        isUnmappedFailClosedApi =
          unmappedUserRes.status === 201 &&
          assignedRoles.includes('STAFF') &&
          !assignedRoles.includes('DOCTOR') &&
          !assignedRoles.includes('VETERINARIAN');
        logSubstep(
          `Unmapped Practice Type Registration Status: ${unmappedUserRes.status}, Assigned Roles: ${JSON.stringify(assignedRoles)} (Expected STAFF only)`
        );
        await apiRequest('DELETE', `${BACKEND_BASE}/admin/clinical-practice-types/${unmappedTypeId}`, null, {
          Authorization: `Bearer ${adminToken}`,
        }).catch(() => {});
      }

      const allSecurityPassed =
        is401 &&
        isDocBlocked &&
        isHumanPetBlocked &&
        isVetPatientBlocked &&
        isSelfEditBlocked &&
        isUnmappedFailClosedApi;

      recordStep(
        15,
        'Security & Safety Gate R1 Assertion',
        allSecurityPassed,
        `Non-admin blocked (401/403), cross-domain isolation active (403 with safety explanation), self-edit blocked (403), unmapped fail-closed`
      );
    } catch (e) {
      recordStep(15, 'Security & Safety Gate R1 Assertion', false, e.message);
    }
  }

  // ==========================================================================
  // UI AUTOMATION & PUPPETEER SCREENSHOTS (Steps 8, 10, 12, Genuine Screenshots)
  // ==========================================================================
  if (!apiOnly && !puppeteer) {
    results.failed++;
    results.errors.push('UI Automation Phase aborted: Puppeteer module not available');
  } else if (!apiOnly && puppeteer) {
    console.log('\n================================================================');
    console.log('EXECUTING BROWSER E2E AUTOMATION & SCREENSHOT VERIFICATION');
    console.log('================================================================');

    let browser;
    try {
      const launchOptions = {
        headless: 'new',
        defaultViewport: { width: 1440, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
      };
      if (CHROME_PATH) {
        launchOptions.executablePath = CHROME_PATH;
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // --- SCREENSHOT 1: Admin Login Screen ---
      logSubstep('Navigating to Admin Login Screen (http://localhost:5174/)...');
      await page.goto(`${ADMIN_WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      const hasLoginInputs =
        (await isElementVisible(page, SELECTORS.adminLogin.emailInput)) &&
        (await isElementVisible(page, SELECTORS.adminLogin.passwordInput));
      if (hasLoginInputs) {
        await captureScreenshot(page, 'goal014_01_admin_login.png', 'Admin Login screen with email & password fields');
      } else {
        logSubstep('Admin login fields not visible; skipping goal014_01_admin_login.png');
      }

      // Authenticate via Token Injection (acquired unconditionally in Phase 0) or UI fallback
      if (adminToken) {
        await injectAdminSession(page, adminToken, CREDENTIALS.admin.email, CREDENTIALS.admin.roles);
      } else {
        try {
          await page.click(SELECTORS.adminLogin.emailTab);
          await page.type(SELECTORS.adminLogin.emailInput, CREDENTIALS.admin.email);
          await page.type(SELECTORS.adminLogin.passwordInput, CREDENTIALS.admin.password);
          await page.click(SELECTORS.adminLogin.submitButton);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }).catch(() => {});
        } catch (uiLoginErr) {
          logSubstep(`UI login notice: ${uiLoginErr.message}`);
        }
      }

      // --- SCREENSHOT 2: Admin Dashboard ---
      logSubstep('Navigating to Admin Dashboard...');
      await page.goto(`${ADMIN_WEB_BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      const onAdminDashboard =
        page.url().includes('/admin/dashboard') && (await isElementVisible(page, SELECTORS.adminLogin.dashboardIndicator));
      if (onAdminDashboard) {
        await captureScreenshot(page, 'goal014_02_admin_dashboard.png', 'Admin Dashboard post-login');
      } else {
        logSubstep('Admin Dashboard sidebar not mounted; skipping goal014_02_admin_dashboard.png');
      }

      // --- SCREENSHOT 3: Settings Tab Navigation ---
      logSubstep('Navigating to Settings Navigation...');
      await page.goto(SELECTORS.settings.generalUrl, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      const practiceTypesTabEl = await findElementWithFallback(
        page,
        SELECTORS.settings.practiceTypesTab,
        'nav button, nav a, div button, div a',
        'Clinical Practice Types'
      );
      if (practiceTypesTabEl) {
        await captureScreenshot(
          page,
          'goal014_03_settings_tab_navigation.png',
          'Settings navigation bar showing Clinical Practice Types tab'
        );
      } else {
        logSubstep('Clinical Practice Types tab is pending M2 UI implementation; skipping goal014_03_settings_tab_navigation.png');
      }

      // --- SCREENSHOT 4: Settings Practice Types Catalogue Table ---
      logSubstep('Navigating to Settings -> Clinical Practice Types...');
      await page.goto(SELECTORS.settings.practiceTypesUrl, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      const hasPracticeTypesTable = await page.evaluate((tableSel) => {
        const table = document.querySelector(tableSel);
        if (!table) return false;
        const rect = table.getBoundingClientRect();
        const text = (document.body.innerText || '').toUpperCase();
        return rect.height > 0 && (text.includes('HUMAN_HEALTHCARE') || text.includes('VETERINARY_MEDICINE'));
      }, SELECTORS.settings.table);
      if (page.url().includes('/admin/settings/clinical-practice-types') && hasPracticeTypesTable) {
        await captureScreenshot(
          page,
          'goal014_04_catalogue_table_canonical.png',
          'Catalogue management table displaying canonical entries'
        );
      } else {
        logSubstep('Clinical Practice Types catalogue table not yet mounted in UI; skipping goal014_04_catalogue_table_canonical.png');
      }

      // --- SCREENSHOT 5 & 6: Add Practice Type Modal & Success ---
      logSubstep('Checking Add Practice Type Modal...');
      try {
        const addBtn = await findElementWithFallback(
          page,
          SELECTORS.settings.addBtn,
          'button',
          'Add Practice Type'
        );
        if (addBtn && hasPracticeTypesTable) {
          await addBtn.click();
          await sleep(1500);
          const addModalVisible =
            (await isElementVisible(page, SELECTORS.settings.addModal.card)) &&
            (await isElementVisible(page, SELECTORS.settings.addModal.codeInput));

          if (addModalVisible) {
            await captureScreenshot(
              page,
              'goal014_05_add_practice_type_modal.png',
              '+ Add Practice Type modal with code, name, description, auth mapping'
            );

            const uiCustomCode = `DENTAL_UI_${Date.now() % 10000}`;
            await setReactInputValue(page, SELECTORS.settings.addModal.codeInput, uiCustomCode);
            await setReactInputValue(page, SELECTORS.settings.addModal.displayNameInput, 'Dental & Oral Health');
            if (await isElementVisible(page, SELECTORS.settings.addModal.descriptionTextarea)) {
              await setReactInputValue(page, SELECTORS.settings.addModal.descriptionTextarea, 'Comprehensive dental surgery');
            }
            if (await isElementVisible(page, SELECTORS.settings.addModal.authMappingSelect)) {
              await selectOptionAndNotify(page, SELECTORS.settings.addModal.authMappingSelect, 'HUMAN_HEALTHCARE');
            }

            const modalSubmit = await page.$(SELECTORS.settings.addModal.submitBtn);
            if (modalSubmit) {
              await modalSubmit.click();
              await sleep(2000);
              const addedRowVisible = await page.evaluate(
                (code) => (document.body.innerText || '').includes(code),
                uiCustomCode
              );
              if (addedRowVisible) {
                await captureScreenshot(
                  page,
                  'goal014_06_add_practice_type_success.png',
                  'Catalogue table displaying newly added practice type'
                );
              } else {
                logSubstep('Newly added practice type did not appear in table; skipping goal014_06_add_practice_type_success.png');
              }
            }
          } else {
            logSubstep('Add Practice Type modal did not mount after click; skipping goal014_05_add_practice_type_modal.png');
          }
        } else {
          logSubstep('Add Practice Type button/table pending M2 implementation; skipping screenshots 05 & 06');
        }
      } catch (addModalErr) {
        logSubstep(`Add modal notice: ${addModalErr.message}`);
      }

      // --- SCREENSHOT 7: Edit Modal for Canonical Entry (Code Protected) ---
      logSubstep('Checking Edit Modal on Canonical Entry...');
      try {
        const editBtn = hasPracticeTypesTable
          ? await findElementWithFallback(page, SELECTORS.settings.editRowBtn, 'table button', 'Edit')
          : null;
        if (editBtn) {
          await editBtn.click();
          await sleep(1500);
          const editModalVisible = await isElementVisible(page, SELECTORS.settings.editModal.card);
          if (editModalVisible) {
            await captureScreenshot(
              page,
              'goal014_07_edit_practice_type_canonical.png',
              'Edit modal for canonical entry with protected/disabled code field'
            );
            await page.keyboard.press('Escape');
            await sleep(1000);
          } else {
            logSubstep('Edit Practice Type modal not visible in DOM; skipping goal014_07_edit_practice_type_canonical.png');
          }
        } else {
          logSubstep('Edit Practice Type button pending M2 implementation; skipping goal014_07_edit_practice_type_canonical.png');
        }
      } catch (editModalErr) {
        logSubstep(`Edit modal notice: ${editModalErr.message}`);
      }

      // --- SCREENSHOT 8: Deactivate Warning Dialog ---
      logSubstep('Checking Deactivate Warning Dialog...');
      try {
        const toggleBtn = hasPracticeTypesTable
          ? await findElementWithFallback(page, SELECTORS.settings.statusToggleBtn, 'table button', 'Deactivate')
          : null;
        if (toggleBtn) {
          await toggleBtn.click();
          await sleep(1500);
          const deactivateDialogVisible = await isElementVisible(page, SELECTORS.settings.deactivateModal.dialog);
          if (deactivateDialogVisible) {
            await captureScreenshot(
              page,
              'goal014_08_deactivate_dialog_warning.png',
              'Deactivation dialog warning that historical doctor links are preserved'
            );
            await page.keyboard.press('Escape');
            await sleep(1000);
          } else {
            logSubstep('Deactivation warning dialog not visible in DOM; skipping goal014_08_deactivate_dialog_warning.png');
          }
        } else {
          logSubstep('Deactivate status toggle pending M2 implementation; skipping goal014_08_deactivate_dialog_warning.png');
        }
      } catch (deactErr) {
        logSubstep(`Deactivate dialog notice: ${deactErr.message}`);
      }

      // --- SCREENSHOT 9: Delete Rejection Dialog for In-Use Entry ---
      logSubstep('Checking Delete Rejection Dialog...');
      try {
        const deleteBtn = hasPracticeTypesTable
          ? await findElementWithFallback(page, SELECTORS.settings.deleteRowBtn, 'table button', 'Delete')
          : null;
        if (deleteBtn) {
          await deleteBtn.click();
          await sleep(1500);
          const deleteRejectionVisible = await isElementVisible(page, SELECTORS.settings.deleteModal.rejectionDialog);
          if (deleteRejectionVisible) {
            await captureScreenshot(
              page,
              'goal014_09_delete_rejection_inuse.png',
              'Delete rejection dialog explaining in-use/canonical assignment'
            );
            await page.keyboard.press('Escape');
            await sleep(1000);
          } else {
            logSubstep('Delete rejection dialog not visible in DOM; skipping goal014_09_delete_rejection_inuse.png');
          }
        } else {
          logSubstep('Delete button pending M2 implementation; skipping goal014_09_delete_rejection_inuse.png');
        }
      } catch (delErr) {
        logSubstep(`Delete dialog notice: ${delErr.message}`);
      }

      // --- SCREENSHOT 10: Admin Add Doctor Dynamic Practice Type Dropdown ---
      logSubstep('Navigating to Admin Add Doctor form (http://localhost:5174/admin/doctors/create)...');
      await page.goto(SELECTORS.adminAddDoctor.url, { waitUntil: 'domcontentloaded' });
      await sleep(2500);
      const hasDynamicAddDoctorSelect = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el || !el.options) return false;
        const vals = Array.from(el.options).map((o) => o.value);
        return vals.includes('HUMAN_HEALTHCARE') && vals.includes('VETERINARY_MEDICINE');
      }, SELECTORS.adminAddDoctor.clinicalPracticeType);

      if (hasDynamicAddDoctorSelect) {
        await captureScreenshot(
          page,
          'goal014_10_add_doctor_dynamic_practice_types.png',
          'Add Doctor form displaying dynamic Clinical Practice Type dropdown'
        );
      } else {
        logSubstep('Add Doctor #clinicalPracticeType does not yet have dynamic HUMAN_HEALTHCARE/VETERINARY_MEDICINE options (pending M2); skipping goal014_10_add_doctor_dynamic_practice_types.png');
      }

      // --- SCREENSHOT 11: Add Doctor Dynamic Specialty Filtering (Human) ---
      logSubstep('Testing Dynamic Specialty Filtering for Human Healthcare...');
      try {
        if (hasDynamicAddDoctorSelect) {
          await selectOptionAndNotify(page, SELECTORS.adminAddDoctor.clinicalPracticeType, 'HUMAN_HEALTHCARE');
          await sleep(1500);
          const hasHumanSpecs = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el && el.options && el.options.length >= 2;
          }, SELECTORS.adminAddDoctor.specialty);
          if (hasHumanSpecs) {
            await captureScreenshot(
              page,
              'goal014_11_add_doctor_specialty_human.png',
              'Add Doctor form showing specialties dynamically filtered for Human Healthcare'
            );
          } else {
            logSubstep('Human specialties not populated in #specialty; skipping goal014_11_add_doctor_specialty_human.png');
          }
        } else {
          logSubstep('Skipping goal014_11_add_doctor_specialty_human.png until dynamic practice types are mounted');
        }
      } catch (specHumanErr) {
        logSubstep(`Specialty Human notice: ${specHumanErr.message}`);
      }

      // --- SCREENSHOT 12: Add Doctor Dynamic Specialty Filtering (Veterinary) ---
      logSubstep('Testing Dynamic Specialty Filtering for Veterinary Medicine...');
      try {
        if (hasDynamicAddDoctorSelect) {
          await selectOptionAndNotify(page, SELECTORS.adminAddDoctor.clinicalPracticeType, 'VETERINARY_MEDICINE');
          await sleep(1500);
          const hasVetSpecs = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el || !el.options) return false;
            return Array.from(el.options).some((o) => o.value.toLowerCase().includes('vet') || o.text.toLowerCase().includes('vet'));
          }, SELECTORS.adminAddDoctor.specialty);
          if (hasVetSpecs) {
            await captureScreenshot(
              page,
              'goal014_12_add_doctor_specialty_vet.png',
              'Add Doctor form showing specialties dynamically filtered for Veterinary Medicine'
            );
          } else {
            logSubstep('Veterinary specialties not populated in #specialty; skipping goal014_12_add_doctor_specialty_vet.png');
          }
        } else {
          logSubstep('Skipping goal014_12_add_doctor_specialty_vet.png until dynamic practice types are mounted');
        }
      } catch (specVetErr) {
        logSubstep(`Specialty Vet notice: ${specVetErr.message}`);
      }

      // --- SCREENSHOT 13: Edit Doctor Dialog Dynamic Practice Type Preselection ---
      logSubstep('Navigating to Admin Doctor Profile to test Edit Dialog...');
      try {
        const targetDoctorId = registeredHumanDoctor?.doctorProfileId || CREDENTIALS.humanDoctor.id;
        await page.goto(`${ADMIN_WEB_BASE}/admin/doctors/${targetDoctorId}`, {
          waitUntil: 'domcontentloaded',
        });
        await sleep(2500);

        const editProfileBtn = await findElementWithFallback(
          page,
          SELECTORS.adminEditDoctor.profileEditBtn,
          'button',
          'Edit Profile'
        );
        if (editProfileBtn) {
          await editProfileBtn.click();
          await sleep(2000);
          const editDialogVisible = await isElementVisible(page, SELECTORS.adminEditDoctor.dialogCard);
          const hasDynamicEditOptions = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el || !el.options) return false;
            return Array.from(el.options).some((o) => o.value === 'HUMAN_HEALTHCARE');
          }, SELECTORS.adminEditDoctor.clinicalPracticeType);

          if (editDialogVisible && hasDynamicEditOptions) {
            await captureScreenshot(
              page,
              'goal014_13_edit_doctor_dialog_dynamic.png',
              'Edit Doctor Profile dialog showing dynamic practice type preselected'
            );
          } else {
            logSubstep('Edit Doctor dialog not open with dynamic practice types (pending M2); skipping goal014_13_edit_doctor_dialog_dynamic.png');
          }
          await page.keyboard.press('Escape');
          await sleep(1000);
        } else {
          logSubstep('Edit Profile button not mounted on Doctor Profile page; skipping goal014_13_edit_doctor_dialog_dynamic.png');
        }
      } catch (editDocErr) {
        logSubstep(`Edit doctor dialog notice: ${editDocErr.message}`);
      }

      // --- STEP 10: Human Doctor Dashboard Routing & Symmetrical 403 Barrier ---
      logStep(10, 'Human Doctor Dashboard Routing (Doctor Web -> /dashboard, /veterinary/* -> 403)');
      try {
        if (humanDoctorToken) {
          const humanCacheProfile = {
            id: CREDENTIALS.humanDoctor.id,
            userId: CREDENTIALS.humanDoctor.id,
            fullName: 'Dr. John Smith',
            email: CREDENTIALS.humanDoctor.email,
            roles: CREDENTIALS.humanDoctor.roles,
            workspaceType: 'HUMAN',
            isHumanDoctor: true,
            isVeterinarian: false,
            hasDualRoleAmbiguity: false,
            profile: { name: 'Dr. John Smith', specialty: 'Cardiology' },
          };
          await injectDoctorSession(page, humanDoctorToken, humanCacheProfile);
        }
        await page.goto(SELECTORS.doctorWeb.humanDashboard, { waitUntil: 'domcontentloaded' });
        await sleep(2500);

        const humanUrl = page.url();
        const onHumanDashboard =
          humanUrl.includes('/dashboard') && !humanUrl.includes('/veterinary') && !humanUrl.includes('/auth/login');
        logSubstep(`Human Doctor landed on URL: ${humanUrl} (Is Human Dashboard: ${onHumanDashboard})`);

        // Symmetrical cross-traversal attempt: Navigate directly to /veterinary/dashboard
        await page.goto(SELECTORS.doctorWeb.vetDashboard, { waitUntil: 'domcontentloaded' });
        await sleep(2500);

        const crossBarrierContent = await page.evaluate(() => document.body.innerText || '');
        const has403Barrier =
          crossBarrierContent.includes('403') ||
          crossBarrierContent.includes('Veterinary Workspace Restricted') ||
          crossBarrierContent.includes('Role Guard Barrier');
        logSubstep(`Cross-domain traversal to /veterinary/dashboard blocked with 403 barrier: ${has403Barrier}`);

        recordStep(
          10,
          'Human Doctor Dashboard Routing',
          onHumanDashboard && has403Barrier,
          `Human Doctor routes to /dashboard and is blocked from /veterinary/* with 403 barrier`
        );
      } catch (humanRoutErr) {
        recordStep(10, 'Human Doctor Dashboard Routing', false, humanRoutErr.message);
      }

      // --- STEP 12 & SCREENSHOT 14: Veterinary Doctor Dashboard Routing & Symmetrical 403 Barrier ---
      logStep(12, 'Veterinary Doctor Dashboard Routing (Doctor Web -> /veterinary/dashboard, /dashboard -> 403)');
      try {
        if (vetDoctorToken) {
          const vetCacheProfile = {
            id: 'vet-doctor-cached',
            userId: 'vet-doctor-cached',
            fullName: 'Dr. Vet Audit',
            email: CREDENTIALS.vetDoctor.email,
            roles: CREDENTIALS.vetDoctor.roles,
            workspaceType: 'VETERINARIAN',
            isHumanDoctor: false,
            isVeterinarian: true,
            hasDualRoleAmbiguity: false,
            profile: { name: 'Dr. Vet Audit', specialty: 'Veterinary Medicine' },
          };
          await injectDoctorSession(page, vetDoctorToken, vetCacheProfile);
        }
        await page.goto(SELECTORS.doctorWeb.vetDashboard, { waitUntil: 'domcontentloaded' });
        await sleep(2500);

        const vetUrl = page.url();
        const onVetDashboard = vetUrl.includes('/veterinary/dashboard') && !vetUrl.includes('/auth/login');
        logSubstep(`Veterinary Doctor landed on URL: ${vetUrl} (Is Vet Dashboard: ${onVetDashboard})`);

        if (onVetDashboard) {
          await captureScreenshot(
            page,
            'goal014_14_doctor_web_workspaces.png',
            'Doctor Web Veterinary Clinical Workspace (/veterinary/dashboard)'
          );
        } else {
          logSubstep('Not on Veterinary Dashboard; skipping goal014_14_doctor_web_workspaces.png');
        }

        // Symmetrical cross-traversal attempt: Navigate directly to /dashboard
        await page.goto(SELECTORS.doctorWeb.humanDashboard, { waitUntil: 'domcontentloaded' });
        await sleep(2500);

        const crossHumanBarrierContent = await page.evaluate(() => document.body.innerText || '');
        const hasHumanBarrier =
          crossHumanBarrierContent.includes('403') ||
          crossHumanBarrierContent.includes('Human Clinical Workspace Restricted') ||
          crossHumanBarrierContent.includes('Role Guard Barrier');
        logSubstep(`Cross-domain traversal to /dashboard blocked with 403 barrier: ${hasHumanBarrier}`);

        recordStep(
          12,
          'Veterinary Doctor Dashboard Routing',
          onVetDashboard && hasHumanBarrier,
          `Vet Doctor routes to /veterinary/dashboard and is blocked from /dashboard with 403 barrier`
        );
      } catch (vetRoutErr) {
        recordStep(12, 'Veterinary Doctor Dashboard Routing', false, vetRoutErr.message);
      }

      // --- STEP 8 & SCREENSHOT 15: Clinical Safety Gate R1 Amber Barrier (Fail-Closed) ---
      logStep(8, 'Unmapped Type Fail-Closed (Clinical Safety Gate R1 Amber Barrier)');
      try {
        // Ensure a genuine DOCTOR_VET ambiguous clinician token exists so Doctor Web restoreSession() does not 401 -> /auth/login
        let ambiguousToken = null;
        if (adminToken) {
          const ambLoginAttempt = await apiRequest('POST', `${BACKEND_BASE}/auth/password/login`, {
            identifier: CREDENTIALS.ambiguousClinician.identifier,
            password: CREDENTIALS.ambiguousClinician.password,
          });
          if (ambLoginAttempt.status === 200 && ambLoginAttempt.body?.data?.accessToken) {
            ambiguousToken = ambLoginAttempt.body.data.accessToken;
          } else {
            const createAmbRes = await apiRequest(
              'POST',
              `${BACKEND_BASE}/admin/users`,
              {
                phone: CREDENTIALS.ambiguousClinician.phone,
                email: CREDENTIALS.ambiguousClinician.email,
                password: CREDENTIALS.ambiguousClinician.password,
                fullName: 'Dr. Ambiguous Dual Scope',
                role: 'DOCTOR_VET',
                primarySpecialization: 'Unmapped Dual Scope',
                licenseNumber: `LIC-AMB-${Date.now() % 100000}`,
                medicalCouncil: 'CareID Safety Governance Board',
                registrationNumber: `REG-AMB-${Date.now() % 100000}`,
              },
              { Authorization: `Bearer ${adminToken}` }
            );
            if (createAmbRes.status === 201) {
              const ambLoginSecond = await apiRequest('POST', `${BACKEND_BASE}/auth/password/login`, {
                identifier: CREDENTIALS.ambiguousClinician.identifier,
                password: CREDENTIALS.ambiguousClinician.password,
              });
              if (ambLoginSecond.status === 200 && ambLoginSecond.body?.data?.accessToken) {
                ambiguousToken = ambLoginSecond.body.data.accessToken;
              }
            }
          }
        }

        const unmappedUser = {
          id: 'unmapped-clinician-uuid',
          userId: 'unmapped-clinician-uuid',
          fullName: 'Dr. Ambiguous Dual Scope',
          email: CREDENTIALS.ambiguousClinician.email,
          roles: ['DOCTOR_VET'],
          clinicalPracticeType: 'UNMAPPED_RESEARCH',
          workspaceType: 'HUMAN',
          isHumanDoctor: true,
          isVeterinarian: true,
          hasDualRoleAmbiguity: true,
          profile: {
            name: 'Dr. Ambiguous Dual Scope',
            specialty: 'Unmapped Dual Scope',
          },
        };

        await page.goto(`${DOCTOR_WEB_BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(
          (tok, u) => {
            sessionStorage.setItem('careid_access_token', tok);
            sessionStorage.setItem('careid_refresh_token', tok);
            sessionStorage.setItem('careid_user_profile_cache', JSON.stringify(u));
            localStorage.setItem('careid_access_token', tok);
            localStorage.setItem('user', JSON.stringify(u));
          },
          ambiguousToken || 'simulated_unmapped_token',
          unmappedUser
        );

        await page.goto(SELECTORS.doctorWeb.humanDashboard, { waitUntil: 'domcontentloaded' });
        await page
          .waitForFunction(
            () => {
              const txt = document.body.innerText || '';
              return (
                txt.includes('Clinical Safety Gate R1') ||
                txt.includes('Dual Clinical Role Ambiguity Detected') ||
                window.location.pathname.includes('/auth/login')
              );
            },
            { timeout: 8000 }
          )
          .catch(() => {});
        await sleep(500);

        const currentGateUrl = page.url();
        const amberText = await page.evaluate(() => document.body.innerText || '');
        const hasAmberGate =
          !currentGateUrl.includes('/auth/login') &&
          (amberText.includes('Clinical Safety Gate R1') ||
            amberText.includes('Dual Clinical Role Ambiguity Detected') ||
            amberText.includes('CareID Clinical Species Isolation Policy'));

        logSubstep(`Doctor Web URL: ${currentGateUrl}, Clinical Safety Gate R1 Amber Barrier rendered: ${hasAmberGate}`);

        if (hasAmberGate) {
          await captureScreenshot(
            page,
            'goal014_15_clinical_safety_gate_amber_barrier.png',
            'Clinical Safety Gate R1 Amber Barrier halting ambiguous/unmapped credentials'
          );
        } else {
          logSubstep('Clinical Safety Gate R1 Amber Barrier not rendered (redirected or unmounted); skipping goal014_15_clinical_safety_gate_amber_barrier.png');
        }

        recordStep(
          8,
          'Unmapped Type Fail-Closed',
          hasAmberGate,
          `Ambiguous/unmapped credentials halt fail-closed at Clinical Safety Gate R1 Amber Barrier`
        );
      } catch (gateErr) {
        recordStep(8, 'Unmapped Type Fail-Closed', false, gateErr.message);
      }

      await page.close();
      await browser.close();
    } catch (browserErr) {
      console.error(`❌ Browser Automation Error: ${browserErr.message}`);
      results.failed++;
      results.errors.push(`Browser Phase: ${browserErr.message}`);
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // ==========================================================================
  // TEARDOWN & SYNTHETIC DATA CLEANUP (Non-destructive)
  // ==========================================================================
  if (adminToken && createdCustomTypeId) {
    console.log('\n--- Phase T: Cleaning Up Synthetic Practice Types ---');
    try {
      const cleanRes = await apiRequest(
        'DELETE',
        `${BACKEND_BASE}/admin/clinical-practice-types/${createdCustomTypeId}`,
        null,
        { Authorization: `Bearer ${adminToken}` }
      );
      logSubstep(`Synthetic unused practice type cleanup status: ${cleanRes.status}`);
    } catch (cleanErr) {
      logSubstep(`Cleanup notice: ${cleanErr.message}`);
    }
  }
  if (adminToken && inUseCustomTypeId) {
    try {
      // Deactivate in-use synthetic practice type while preserving referential integrity
      const deactInUseRes = await apiRequest(
        'PATCH',
        `${BACKEND_BASE}/admin/clinical-practice-types/${inUseCustomTypeId}/status`,
        { status: 'INACTIVE' },
        { Authorization: `Bearer ${adminToken}` }
      );
      logSubstep(`Synthetic in-use practice type deactivated (preserving doctor link): ${deactInUseRes.status}`);
    } catch (cleanErr) {
      logSubstep(`In-use cleanup notice: ${cleanErr.message}`);
    }
  }

  // ==========================================================================
  // FINAL SCORECARD & SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log('GOAL 014 INTEGRATION SUITE EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Total Phase 7 Steps Tested: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log('----------------------------------------------------------------');

  for (let i = 1; i <= 15; i++) {
    const s = results.steps[i];
    if (s) {
      const icon = s.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      console.log(`Step ${i.toString().padStart(2, ' ')}: [${icon}] ${s.name} - ${s.details || ''}`);
    } else {
      console.log(`Step ${i.toString().padStart(2, ' ')}: [⏭️ SKIP] Step not evaluated in current run flags`);
    }
  }

  console.log('----------------------------------------------------------------');
  if (results.errors.length > 0) {
    console.log('\nIdentified Failures / Execution Notes:');
    results.errors.forEach((err) => console.log(`  - ${err}`));
  }

  const allPassed = results.failed === 0 && results.errors.length === 0 && results.passed > 0;
  console.log(`\nFinal Verdict: ${allPassed ? '✅ SUITE PASSED' : '⚠️ COMPLETED WITH FAILURES / PENDING M2 UI'}`);
  console.log('================================================================\n');

  return allPassed;
}

// CLI Execution Entrypoint
if (require.main === module) {
  runTestSuite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal Test Suite Failure:', err);
      process.exit(1);
    });
}

module.exports = { runTestSuite };
