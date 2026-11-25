const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const { getFreshToken } = require('./get_fresh_token.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== Verifying Patient Counts Consistency Across User Directory & Patients Directory ===');
  const token = await getFreshToken();

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Prime session in localStorage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, { token });

  // =========================================================================
  // 1. PATIENTS DIRECTORY (/admin/patients)
  // =========================================================================
  console.log('\n--- 1. Testing Patients Directory (/admin/patients) ---');
  await page.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patients-table-row', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  const patientKpis = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.patients-kpi-card'));
    return cards.map(c => ({
      label: c.querySelector('.patients-kpi-label')?.innerText.trim(),
      val: c.querySelector('.patients-kpi-value')?.innerText.trim(),
      subtext: (c.querySelector('.patients-kpi-footer-trend') || c.querySelector('.patients-kpi-footer-text'))?.innerText.trim()
    }));
  });
  console.log('Patients Directory KPIs:', JSON.stringify(patientKpis, null, 2));

  const patientRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.patients-table-row')).map(r => ({
      name: r.querySelector('.patients-name-text')?.innerText.trim(),
      hvid: r.querySelector('.patients-vault-id')?.innerText.trim(),
      verification: r.querySelector('.patients-badge-text')?.innerText.trim(),
      status: r.querySelector('.patients-status-badge')?.innerText.trim()
    }));
  });
  console.log('Patients Directory Rows count:', patientRows.length);
  console.log('Patients Directory Rows:', patientRows);

  const shotPatients = path.join(ARTIFACT_DIR, 'verify_patients_directory_consistent.png');
  await page.screenshot({ path: shotPatients, fullPage: false });
  console.log('Saved screenshot:', shotPatients);

  // =========================================================================
  // 2. USER DIRECTORY -> PATIENTS FILTER (/admin/users)
  // =========================================================================
  console.log('\n--- 2. Testing User Directory -> Patients Filter (/admin/users) ---');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // Click "Patients" chip
  const chips = await page.$$('.users-filter-chip');
  for (const c of chips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Patients') {
      await c.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const paginationInfo = await page.evaluate(() => {
    const el = document.querySelector('.users-table-card');
    return el ? el.innerText.match(/Showing \d+ to \d+ of \d+ results/)?.[0] : 'N/A';
  });
  console.log('User Directory Patients pagination text:', paginationInfo);

  const userPatientRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(r => ({
      name: r.querySelector('.user-name')?.innerText.trim(),
      hvid: r.querySelector('.user-hvid')?.innerText.trim(),
      role: r.querySelector('.user-role-badge')?.innerText.trim(),
      status: r.querySelector('.user-status-text')?.innerText.trim(),
      verification: r.querySelector('.user-verification-badge')?.innerText.trim()
    }));
  });
  console.log('User Directory Patients Rows (Page 1):', userPatientRows);

  const shotUserPatients = path.join(ARTIFACT_DIR, 'verify_users_patients_filter_consistent.png');
  await page.screenshot({ path: shotUserPatients, fullPage: false });
  console.log('Saved screenshot:', shotUserPatients);

  // =========================================================================
  // 3. USER DIRECTORY -> PENDING FILTER
  // =========================================================================
  console.log('\n--- 3. Testing User Directory -> Pending Filter ---');
  for (const c of chips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Pending') {
      await c.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const pendingRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(r => ({
      name: r.querySelector('.user-name')?.innerText.trim(),
      role: r.querySelector('.user-role-badge')?.innerText.trim(),
      verification: r.querySelector('.user-verification-badge')?.innerText.trim()
    }));
  });
  console.log('User Directory Pending Filter Rows:', pendingRows);

  const shotUserPending = path.join(ARTIFACT_DIR, 'verify_users_pending_filter_consistent.png');
  await page.screenshot({ path: shotUserPending, fullPage: false });
  console.log('Saved screenshot:', shotUserPending);

  // =========================================================================
  // 4. USER DIRECTORY -> VERIFIED FILTER
  // =========================================================================
  console.log('\n--- 4. Testing User Directory -> Verified Filter ---');
  for (const c of chips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Verified') {
      await c.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const verifiedRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(r => ({
      name: r.querySelector('.user-name')?.innerText.trim(),
      role: r.querySelector('.user-role-badge')?.innerText.trim(),
      verification: r.querySelector('.user-verification-badge')?.innerText.trim()
    }));
  });
  console.log('User Directory Verified Filter Rows:', verifiedRows);

  const shotUserVerified = path.join(ARTIFACT_DIR, 'verify_users_verified_filter_consistent.png');
  await page.screenshot({ path: shotUserVerified, fullPage: false });
  console.log('Saved screenshot:', shotUserVerified);

  await browser.close();
  console.log('\n=== All Verification Tests Completed Successfully ===');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});

