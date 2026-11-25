const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const TOKEN_FILE = path.join(__dirname, 'cached_token.json');

async function getFreshToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.accessToken;
  }
  return null;
}

async function run() {
  const token = await getFreshToken();
  console.log('Using token starting with:', token ? token.substring(0, 15) : 'NONE');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set auth tokens first on base domain
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  if (token) {
    await page.evaluate((tok) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: 'admin-id',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        phone: '+16505550001'
      }));
    }, token);
  }

  const pagesToTest = [
    { name: 'reports_dashboard', url: 'http://localhost:5173/admin/reports' },
    { name: 'reports_ocr_performance', url: 'http://localhost:5173/admin/reports/ocr-performance' },
    { name: 'reports_system_health', url: 'http://localhost:5173/admin/reports/system-health' },
    { name: 'reports_referral_activity', url: 'http://localhost:5173/admin/reports/referral-activity' }
  ];

  for (const p of pagesToTest) {
    // 1. Desktop 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const desktopShot = path.join(ARTIFACT_DIR, `${p.name}_desktop_1440.png`);
    await page.screenshot({ path: desktopShot, fullPage: true });
    console.log(`Saved screenshot: ${desktopShot}`);

    // 2. Mobile 390x844
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 1000));
    const mobileShot = path.join(ARTIFACT_DIR, `${p.name}_mobile_390.png`);
    await page.screenshot({ path: mobileShot, fullPage: true });
    console.log(`Saved screenshot: ${mobileShot}`);
  }

  await browser.close();
  console.log('All screenshots saved successfully!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
