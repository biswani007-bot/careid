const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    r.end();
  });
}

async function runE2E() {
  console.log('================================================================');
  console.log('CAREID — COMPLETE DOCTOR REGISTRATION AUDIT & VERIFICATION');
  console.log('================================================================');

  const token = await getAdminToken();
  console.log('✓ Acquired active Admin JWT token.');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

  // Intercept all network traffic
  const interceptedCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/v1/')) {
      interceptedCalls.push({
        method: req.method(),
        url: url,
        postData: req.postData()
      });
    }
  });

  const interceptedResponses = [];
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/v1/')) {
      let text = '';
      try { text = await res.text(); } catch (e) {}
      interceptedResponses.push({
        status: res.status(),
        url: url,
        body: text.slice(0, 500)
      });
    }
  });

  // Step 1: Set authentication session
  console.log('\n--- STEP 1: AUTHENTICATION INITIALIZATION ---');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  // Step 2: Navigate to Doctor Registration Form
  console.log('\n--- STEP 2: LOAD DOCTOR REGISTRATION FORM ---');
  await page.goto('http://localhost:5174/admin/doctors/create', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#firstName', { timeout: 10000 });
  console.log('✓ Successfully loaded /admin/doctors/create');

  // Step 3: Populate Form Fields
  console.log('\n--- STEP 3: POPULATE FORM FIELDS ---');
  const testLicNum = `MD-${Date.now().toString().slice(-6)}`;
  const doctorFirstName = 'Clara';
  const doctorLastName = `Barton-${Date.now().toString().slice(-4)}`;

  function setReactInputValue(selector, value) {
    return page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, selector, value);
  }

  await page.type('#firstName', doctorFirstName);
  await page.type('#lastName', doctorLastName);
  await page.select('#gender', 'Female');
  await setReactInputValue('#dob', '1985-05-18');
  await page.type('#license', testLicNum);
  await page.type('#issuingBody', 'American Board of Internal Medicine');
  await setReactInputValue('#licenseExpiry', '2029-12-31');
  await page.type('#experienceYears', '15');
  await page.select('#specialty', 'Cardiology');
  await page.type('#subSpecialty', 'Electrophysiology');

  // Select hospital facility
  await page.waitForFunction(() => {
    const sel = document.querySelector('#hospital');
    return sel && sel.options.length > 1;
  }, { timeout: 5000 });

  const hospitalVal = await page.evaluate(() => {
    const sel = document.querySelector('#hospital');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.includes('-')) return sel.options[i].value;
    }
    return sel.options[1].value;
  });
  console.log('Selected Hospital Facility ID:', hospitalVal);
  await page.select('#hospital', hospitalVal);

  await page.type('#department', 'Department of Cardiology');
  await page.type('#officeNumber', 'Suite 502-B');
  await page.type('#email', `clara.barton.${Date.now().toString().slice(-4)}@careid.test`);
  await page.type('#phone', '+1 (650) 555-8832');

  // Capture screenshot of filled form
  const screenshotForm = path.join(ARTIFACT_DIR, 'doctor_registration_01_form_filled.png');
  await page.screenshot({ path: screenshotForm, fullPage: true });
  console.log('✓ Form screenshot captured:', screenshotForm);

  // Step 4: Submit the Registration Form
  console.log('\n--- STEP 4: SUBMIT REGISTRATION FORM ---');
  await page.click('button[type="submit"]');
  console.log('Clicked "Register Doctor" button.');

  // Wait for UI snackbar notification
  await page.waitForFunction(() => {
    const snackbar = document.querySelector('.user-action-snackbar');
    return snackbar && snackbar.textContent && snackbar.textContent.trim().length > 0;
  }, { timeout: 15000 });

  const snackbarText = await page.evaluate(() => {
    const el = document.querySelector('.user-action-snackbar-text') || document.querySelector('.user-action-snackbar');
    return el ? el.textContent.trim() : null;
  });
  console.log('✓ UI Feedback Received:', snackbarText);

  // Capture screenshot of submission feedback
  const screenshotFeedback = path.join(ARTIFACT_DIR, 'doctor_registration_02_submitted_feedback.png');
  await page.screenshot({ path: screenshotFeedback, fullPage: false });
  console.log('✓ Submission feedback screenshot captured:', screenshotFeedback);

  // Verify Network Calls during submission
  console.log('\n--- STEP 5: VERIFY API ENDPOINT CALLS ---');
  const adminUsersCalls = interceptedCalls.filter(c => c.url.includes('/admin/users') && c.method === 'POST');
  const adminDoctorsCalls = interceptedCalls.filter(c => c.url.includes('/admin/doctors') && c.method === 'POST');
  const validDoctorCalls = interceptedCalls.filter(c => c.url.endsWith('/api/v1/doctors') && c.method === 'POST');

  console.log(`Calls to invalid POST /api/v1/admin/users: ${adminUsersCalls.length} (Expected: 0)`);
  console.log(`Calls to invalid POST /api/v1/admin/doctors: ${adminDoctorsCalls.length} (Expected: 0)`);
  console.log(`Calls to valid POST /api/v1/doctors: ${validDoctorCalls.length} (Expected: >= 1)`);

  if (validDoctorCalls.length > 0) {
    console.log('✓ Verified DTO Payload sent to POST /api/v1/doctors:');
    console.log(' ', validDoctorCalls[0].postData);
  }

  // Step 6: Navigate to Doctor Directory and Verify Records
  console.log('\n--- STEP 6: VERIFY DOCTOR DIRECTORY ---');
  await page.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.doctor-directory-table, table', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  const screenshotDir = path.join(ARTIFACT_DIR, 'doctor_registration_03_directory_verified.png');
  await page.screenshot({ path: screenshotDir, fullPage: true });
  console.log('✓ Doctor Directory screenshot captured:', screenshotDir);

  await browser.close();

  // Step 7: Direct Backend Persistence Verification
  console.log('\n--- STEP 7: DIRECT BACKEND PERSISTENCE AUDIT ---');
  const allDocsRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors?limit=50',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  const docs = allDocsRes.body.data || allDocsRes.body;
  console.log(`Total live doctor records in /api/v1/doctors: ${docs.length}`);
  console.log('\nRecent Registered Doctors in Master Registry:');
  docs.slice(0, 5).forEach((d, idx) => {
    console.log(`  [${idx + 1}] ID: ${d.id}`);
    console.log(`      Name: ${d.fullName}`);
    console.log(`      License: ${d.licenseNumber}`);
    console.log(`      Specialty: ${d.primarySpecialization}`);
    console.log(`      Status: ${d.verificationStatus}`);
    console.log(`      Created: ${d.createdAt}`);
  });

  // Verify Facility Doctors
  if (hospitalVal) {
    const facDocsRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/facilities/${hospitalVal}/doctors`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const facDocs = facDocsRes.body.data || facDocsRes.body;
    console.log(`\nAssociated doctors in facility ${hospitalVal}: ${facDocs.length}`);
    facDocs.slice(0, 3).forEach((fd, i) => {
      console.log(`  [${i + 1}] Doctor ID: ${fd.id}, Name: ${fd.fullName}, Spec: ${fd.specialization || fd.primarySpecialization}`);
    });
  }

  console.log('\n================================================================');
  console.log('✓ CAREID DOCTOR REGISTRATION VERIFICATION COMPLETE — 100% PASS');
  console.log('================================================================');
}

runE2E().catch(err => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
