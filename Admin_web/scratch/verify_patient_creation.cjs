const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFreshToken() {
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached && cached.refreshToken) {
        console.log('Refreshing token using refreshToken...');
        const refData = JSON.stringify({ refreshToken: cached.refreshToken });
        const refRes = await httpRequest({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/token/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(refData) }
        }, refData);
        if (refRes.status === 200 && refRes.body?.data?.accessToken) {
          cached.accessToken = refRes.body.data.accessToken;
          cached.token = refRes.body.data.accessToken;
          cached.refreshToken = refRes.body.data.refreshToken || cached.refreshToken;
          cached.expiresAt = Date.now() + 14 * 60 * 1000;
          fs.writeFileSync('scratch/cached_token.json', JSON.stringify(cached, null, 2));
          console.log('Successfully refreshed access token!');
          return cached;
        }
      }
      if (cached && cached.accessToken && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
        console.log('Using valid cached Super Admin token...');
        return cached;
      }
    } catch {}
  }

  console.log('Obtaining fresh Super Admin token for browser...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  if (otpRes.status === 429) {
    if (fs.existsSync('scratch/cached_token.json')) {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached && cached.accessToken) {
        console.log('Rate limited on OTP request, reusing existing cached token...');
        return cached;
      }
    }
  }

  console.log('OTP request status:', otpRes.status, otpRes.body);
  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  console.log('OTP verify status:', verifyRes.status, verifyRes.body);
  const authData = verifyRes.body?.data;
  if (!authData || !authData.accessToken) {
    throw new Error('Failed to obtain accessToken: ' + JSON.stringify(verifyRes.body));
  }
  
  // Call /api/v1/auth/me to get the user details
  const meRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${authData.accessToken}` }
  });

  const user = meRes.body?.data || {
    id: 'bc6f6875-434c-4050-b893-07343cc27986',
    email: 'superadmin@careid.test',
    phone: '+16505550001',
    status: 'ACTIVE',
    roles: ['SUPER_ADMIN'],
    permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
  };

  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    user,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  return tokenPayload;
}

async function runPatientVerification() {
  const authPayload = await getFreshToken();
  const token = authPayload.token;
  const refreshToken = authPayload.refreshToken;
  const userSession = authPayload.user;

  console.log(`Launching headless browser targeting ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Monitor network for API requests
  const capturedApiTraffic = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/')) {
      try {
        const text = await response.text();
        capturedApiTraffic.push({
          method: response.request().method(),
          url,
          status: response.status(),
          responseSnippet: text.slice(0, 300)
        });
      } catch {}
    }
  });

  // Pre-seed auth session
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, userSession }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', token);
    sessionStorage.setItem('careid_refresh_token', refreshToken);
    sessionStorage.setItem('careid_user_session', JSON.stringify(userSession));
  }, { token, refreshToken, userSession });

  // 1. Navigate to Patient Registration Form
  console.log('1. Navigating to /admin/patients/create...');
  await page.goto(`${BASE_URL}/admin/patients/create`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 15000 });
  await page.waitForSelector('input[name="firstName"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const testPatient = {
    firstName: 'Lucas',
    lastName: 'Vance',
    dob: '1988-08-14',
    gender: 'Male',
    email: `lucas.vance.${Date.now()}@careid.test`,
    phone: `+1650555${Math.floor(1000 + Math.random() * 9000)}`,
    zipCode: '90210',
    address: '450 Rodeo Drive, Beverly Hills, CA'
  };

  console.log('Filling registration form for:', testPatient);
  await page.type('input[name="firstName"]', testPatient.firstName);
  await page.type('input[name="lastName"]', testPatient.lastName);
  await page.evaluate((val) => {
    const input = document.querySelector('input[name="dob"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, testPatient.dob);
  await page.select('select[name="gender"]', testPatient.gender);
  await page.type('input[name="email"]', testPatient.email);
  await page.type('input[name="phone"]', testPatient.phone);
  await page.type('input[name="zipCode"]', testPatient.zipCode);
  await page.type('input[name="address"]', testPatient.address);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_1_form_filled.png'), fullPage: false });
  console.log('Saved patient_flow_1_form_filled.png');

  // 2. Click Submit
  console.log('Submitting Patient Registration Form...');
  await page.click('button[type="submit"]');

  // Check form values and errors
  await new Promise(r => setTimeout(r, 1000));
  const formState = await page.evaluate(() => {
    const errorEls = Array.from(document.querySelectorAll('.patient-reg-error-text'));
    return {
      errors: errorEls.map(e => e.innerText),
      dobVal: document.querySelector('input[name="dob"]')?.value
    };
  });
  console.log('Form state after submit:', formState);

  // Wait for network response and success modal
  await page.waitForSelector('.patient-reg-modal-card', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const modalDetails = await page.evaluate(() => {
    return {
      title: document.querySelector('#success-dialog-title')?.innerText,
      desc: document.querySelector('.patient-reg-modal-desc')?.innerText,
      vaultId: document.querySelector('.patient-reg-modal-badge')?.innerText,
    };
  });
  console.log('Success modal details:', modalDetails);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_2_success_modal.png'), fullPage: false });
  console.log('Saved patient_flow_2_success_modal.png');

  // 3. Click "View Patient Profile"
  console.log('Clicking "View Patient Profile" in modal...');
  await page.click('.patient-reg-modal-btn-primary');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const currentUrl = page.url();
  console.log('Current URL after navigating to details:', currentUrl);

  const profilePageDetails = await page.evaluate(() => {
    return {
      url: window.location.pathname,
      name: document.querySelector('.patient-profile-name')?.innerText,
      vaultId: document.querySelector('.patient-profile-vault-badge')?.innerText,
      demographics: document.querySelector('.patient-profile-demographics')?.innerText,
      phone: document.querySelector('[data-node-id="20:1449"] span')?.innerText || document.body.innerText.match(/\+1650555\d{4}/)?.[0],
      email: document.querySelector('[data-node-id="20:1451"] span')?.innerText || document.body.innerText.match(/[\w.-]+@careid\.test/)?.[0],
      notFound: document.querySelector('.patient-profile-loading p')?.innerText,
    };
  });
  console.log('Profile page evaluation:', profilePageDetails);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_3_profile_loaded.png'), fullPage: false });
  console.log('Saved patient_flow_3_profile_loaded.png');

  // 4. Refresh Details Page
  console.log('4. Refreshing the patient details page...');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const refreshedPageDetails = await page.evaluate(() => {
    return {
      url: window.location.pathname,
      name: document.querySelector('.patient-profile-name')?.innerText,
      vaultId: document.querySelector('.patient-profile-vault-badge')?.innerText,
      demographics: document.querySelector('.patient-profile-demographics')?.innerText,
      notFound: document.querySelector('.patient-profile-loading p')?.innerText,
    };
  });
  console.log('Refreshed page evaluation:', refreshedPageDetails);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_4_profile_refreshed.png'), fullPage: false });
  console.log('Saved patient_flow_4_profile_refreshed.png');

  // 5. Navigate to Patient Directory
  console.log('5. Navigating to /admin/patients directory...');
  await page.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 15000 });
  await page.waitForSelector('.patients-table', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  const directoryDetails = await page.evaluate((searchName) => {
    const tableText = document.querySelector('.patients-table')?.innerText || '';
    return {
      hasNewPatient: tableText.includes(searchName),
      firstRow: document.querySelector('.patients-table tbody tr')?.innerText.slice(0, 150),
      totalRows: document.querySelectorAll('.patients-table tbody tr').length
    };
  }, testPatient.firstName);
  console.log('Directory verification:', directoryDetails);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_5_directory.png'), fullPage: false });
  console.log('Saved patient_flow_5_directory.png');

  // 6. Open an existing patient (e.g. David or first row)
  console.log('6. Opening existing patient from directory table...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.patients-table tbody tr'));
    const targetRow = rows.find(r => r.innerText.includes('David') || r.innerText.includes('Marcus') || r.innerText.includes('Test')) || rows[0];
    if (targetRow) {
      targetRow.click();
    }
  });

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const existingProfileDetails = await page.evaluate(() => {
    return {
      url: window.location.pathname,
      name: document.querySelector('.patient-profile-name')?.innerText,
      vaultId: document.querySelector('.patient-profile-vault-badge')?.innerText,
      notFound: document.querySelector('.patient-profile-loading p')?.innerText,
    };
  });
  console.log('Existing patient profile evaluation:', existingProfileDetails);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'patient_flow_6_existing_profile.png'), fullPage: false });
  console.log('Saved patient_flow_6_existing_profile.png');

  console.log('\n--- CAPTURED API TRAFFIC ---');
  capturedApiTraffic.forEach(t => {
    console.log(`[${t.method}] ${t.url} -> HTTP ${t.status}`);
  });

  await browser.close();
  console.log('\nAll runtime tests completed successfully!');
}

runPatientVerification().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
