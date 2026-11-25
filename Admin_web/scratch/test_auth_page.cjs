const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function testAuthAndPage() {
  const cachedAuth = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cachedAuth.token || cachedAuth.accessToken;
  const refreshToken = cachedAuth.refreshToken;
  const userSession = {
    id: 'bc6f6875-434c-4050-b893-07343cc27986',
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

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Navigate to root to set localStorage on same origin
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, userSession }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_remember_me', 'true');
  }, { token, refreshToken, userSession });

  console.log('Navigating to /admin/referrals...');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'debug_page.png') });

  await browser.close();
}

testAuthAndPage().catch(console.error);

