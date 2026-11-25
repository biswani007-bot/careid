const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== Running Live Backend Verification for User Directory ===');
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Prime session in localStorage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  // 1. Desktop 1920x1080 Main Directory
  console.log('\n1. Navigating to /admin/users (Desktop 1920x1080)...');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  await new Promise(r => setTimeout(r, 1200));

  const shot1 = path.join(ARTIFACT_DIR, 'verify_users_directory_desktop_1920.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved screenshot 1:', shot1);

  // 2. Search for "Marcus"
  console.log('\n2. Testing search for "Marcus"...');
  await page.focus('.users-search-input');
  await page.type('.users-search-input', 'Marcus');
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('.users-table-row .user-name'));
    return rows.some(r => r.innerText.includes('Marcus'));
  }, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const shotSearchMarcus = path.join(ARTIFACT_DIR, 'verify_users_search_marcus.png');
  await page.screenshot({ path: shotSearchMarcus, fullPage: false });
  console.log('Saved Marcus search screenshot:', shotSearchMarcus);

  // 3. Search for "Alice" (Staff)
  console.log('\n3. Testing search for "Alice" (Staff)...');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  await page.focus('.users-search-input');
  await page.type('.users-search-input', 'Alice');
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('.users-table-row .user-name'));
    return rows.some(r => r.innerText.includes('Alice'));
  }, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const shotSearchAlice = path.join(ARTIFACT_DIR, 'verify_users_search_alice.png');
  await page.screenshot({ path: shotSearchAlice, fullPage: false });
  console.log('Saved Alice search screenshot:', shotSearchAlice);

  // 4. Role Filter: "Admins"
  console.log('\n4. Testing filter "Admins"...');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  const adminChips = await page.$$('.users-filter-chip');
  for (const c of adminChips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Admins') {
      await c.click();
      break;
    }
  }
  await page.waitForFunction(() => {
    const names = Array.from(document.querySelectorAll('.users-table-row .user-name')).map(e => e.innerText);
    return names.some(n => n.includes('Chen'));
  }, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const shotAdmins = path.join(ARTIFACT_DIR, 'verify_users_filter_admins.png');
  await page.screenshot({ path: shotAdmins, fullPage: false });
  console.log('Saved Admins filter screenshot:', shotAdmins);

  // 5. Role Filter: "Doctors"
  console.log('\n5. Testing filter "Doctors"...');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  const docChips = await page.$$('.users-filter-chip');
  for (const c of docChips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Doctors') {
      await c.click();
      break;
    }
  }
  await page.waitForFunction(() => {
    const names = Array.from(document.querySelectorAll('.users-table-row .user-name')).map(e => e.innerText);
    return names.some(n => n.includes('Jenkins'));
  }, { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const shotDocs = path.join(ARTIFACT_DIR, 'verify_users_filter_doctors.png');
  await page.screenshot({ path: shotDocs, fullPage: false });
  console.log('Saved Doctors filter screenshot:', shotDocs);

  // 6. User Details Page for Marcus Done
  console.log('\n6. Navigating to User Details for Marcus Done...');
  await page.goto(`${BASE_URL}/admin/users/fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.profile-card-name');
    return el && el.innerText.includes('Marcus');
  }, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  const shotDetails = path.join(ARTIFACT_DIR, 'verify_users_details_marcus.png');
  await page.screenshot({ path: shotDetails, fullPage: false });
  console.log('Saved details screenshot:', shotDetails);

  // 7. Multi-viewport Screenshots for User Directory
  console.log('\n7. Capturing multi-viewport screenshots for User Directory...');
  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  await new Promise(r => setTimeout(r, 600));

  // Laptop 1366x768
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 600));
  const shotLaptop = path.join(ARTIFACT_DIR, 'verify_users_laptop_1366.png');
  await page.screenshot({ path: shotLaptop, fullPage: false });

  // Tablet 768x1024
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 600));
  const shotTablet = path.join(ARTIFACT_DIR, 'verify_users_tablet_768.png');
  await page.screenshot({ path: shotTablet, fullPage: false });

  // Mobile 375x812
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 600));
  const shotMobile = path.join(ARTIFACT_DIR, 'verify_users_mobile_375.png');
  await page.screenshot({ path: shotMobile, fullPage: false });

  await browser.close();
  console.log('\n=== All Automated Tests Completed Successfully ===');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
