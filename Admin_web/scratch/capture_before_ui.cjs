const puppeteer = require('puppeteer');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  const token = await getFreshToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Seed session token
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'admin-super-01',
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'superadmin@careid.com'
    }));
  }, token);

  // 1440px viewport
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_ui_before_1440.png'), fullPage: true });

  // 1920px viewport
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_ui_before_1920.png'), fullPage: true });

  // Mobile viewport (390px)
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_ui_before_mobile.png'), fullPage: true });

  console.log('Captured before screenshots.');
  await browser.close();
})();

