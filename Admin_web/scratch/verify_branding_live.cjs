const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');
const BASE_URL = 'http://localhost:5173';

async function verifyBrandingLive() {
  console.log('--- Verifying CareID Live Branding ---');
  let token = '', refreshToken = '';
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const c = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    token = c.token;
    refreshToken = c.refreshToken;
  }

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // 1. Check title on login page
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  const pageTitle = await page.title();
  console.log('Login Page Title:', pageTitle);

  // Set session
  await page.evaluate(({ token, refreshToken }) => {
    const mockUser = {
      id: 'usr_superadmin_01',
      fullName: 'Sarah Jenkins Chen',
      email: 's.chen@careid.com',
      phone: '+16505550001',
      status: 'active',
      roles: ['super_admin', 'security_officer'],
      permissions: ['*']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('token', token);
    localStorage.setItem('careid_user_session', JSON.stringify(mockUser));
    localStorage.setItem('user', JSON.stringify(mockUser));
  }, { token, refreshToken });

  // 2. Check Dashboard Subtitle
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.dashboard-heading-subtitle', { timeout: 10000 });
  const dashboardSubtitle = await page.evaluate(() => {
    return document.querySelector('.dashboard-heading-subtitle')?.textContent?.trim();
  });
  console.log('Dashboard Subtitle:', dashboardSubtitle);
  if (!dashboardSubtitle || !dashboardSubtitle.includes('CareID')) {
    throw new Error('Dashboard subtitle does not mention CareID');
  }

  // 3. Check Patient Directory
  await page.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patients-subtitle', { timeout: 10000 });
  const patientSubtitle = await page.evaluate(() => {
    return document.querySelector('.patients-subtitle')?.textContent?.trim();
  });
  console.log('Patient Directory Subtitle:', patientSubtitle);
  if (!patientSubtitle || !patientSubtitle.includes('CareID')) {
    throw new Error('Patient Directory subtitle does not mention CareID');
  }

  // 4. Check Patient Registration
  await page.goto(`${BASE_URL}/admin/patients/register`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patient-reg-subtitle', { timeout: 10000 });
  const regSubtitle = await page.evaluate(() => {
    return document.querySelector('.patient-reg-subtitle')?.textContent?.trim();
  });
  console.log('Patient Registration Subtitle:', regSubtitle);
  if (!regSubtitle || !regSubtitle.includes('CareID')) {
    throw new Error('Patient Registration subtitle does not mention CareID');
  }

  // 5. Check Add Doctor Temporary Password
  await page.goto(`${BASE_URL}/admin/doctors/add`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#temporaryPassword', { timeout: 10000 });
  const tempPassword = await page.evaluate(() => {
    const input = document.querySelector('#temporaryPassword');
    return input ? input.value : null;
  });
  console.log('Add Doctor Temporary Password:', tempPassword);
  if (!tempPassword || !tempPassword.includes('CareID')) {
    throw new Error('Temporary password does not contain CareID prefix');
  }

  // Take screenshot of Dashboard
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_careid_dashboard_branding.png'), fullPage: true });

  await browser.close();
  console.log('\n✓ ALL CAREID BRANDING LIVE CHECKS PASSED SUCCESSFULLY!');
}

verifyBrandingLive().catch(err => {
  console.error('Branding verification failed:', err);
  process.exit(1);
});
