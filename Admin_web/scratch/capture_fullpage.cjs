const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function captureFullPage() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('careid_admin_auth', JSON.stringify({
      isAuthenticated: true,
      user: {
        id: 'usr-admin-1',
        name: 'Evelyn Reed',
        email: 'evelyn.reed@careid.health',
        role: 'SUPER_ADMIN'
      }
    }));
  });

  await page.goto('http://localhost:5173/admin/security-compliance', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.setViewport({ width: 1440, height: 1024 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'security_compliance_fullpage_1440.png'),
    fullPage: true
  });

  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'security_compliance_fullpage_mobile_375.png'),
    fullPage: true
  });

  await browser.close();
  console.log('✅ Full page screenshots captured successfully!');
}

captureFullPage().catch(err => {
  console.error(err);
  process.exit(1);
});

