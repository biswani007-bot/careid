const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function verifyMultipleReferrals() {
  const cachedAuth = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cachedAuth.token || cachedAuth.accessToken;
  const refreshToken = cachedAuth.refreshToken;
  const userSession = {
    id: 'bc6f6875-434c-4050-b893-07343cc27986',
    email: 'superadmin@careid.test',
    phone: '+16505550001',
    status: 'ACTIVE',
    roles: ['SUPER_ADMIN'],
    permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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

  await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Click row 2
  console.log('Clicking row 2 (#REF-2026-00030)...');
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('.referral-cell-id button');
    if (buttons[1]) buttons[1].click();
  });

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 6000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL after clicking row 2:', page.url());
  const row2Content = await page.evaluate(() => {
    return {
      title: document.querySelector('.referral-main-heading')?.innerText,
      breadcrumb: document.querySelector('.referral-breadcrumb-current')?.innerText,
      patientName: document.querySelector('.referral-patient-name')?.innerText,
      referringDoc: document.querySelector('[data-card="referral-information"] .referral-field-group:nth-child(4) .referral-field-value')?.innerText,
      notFound: document.querySelector('.referral-empty-state-card')?.innerText,
    };
  });
  console.log('Row 2 Detail page evaluation:', row2Content);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_6_row2_details.png'), fullPage: false });
  console.log('Saved referral_fix_6_row2_details.png');

  await browser.close();
}

verifyMultipleReferrals().catch(console.error);

