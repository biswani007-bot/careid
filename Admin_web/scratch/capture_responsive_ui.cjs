const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'responsive_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop_1920', width: 1920, height: 1080 },
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1366', width: 1366, height: 768 },
  { name: 'laptop_1024', width: 1024, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
];

async function captureResponsiveUI() {
  const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cached.accessToken;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testDoctorId = '5c1c3002-30a7-434b-97d0-cf69f2bdd708'; // Dr. Swagat Pradhan, MD

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    // Set auth
    await page.goto('http://localhost:5174/admin/login', { waitUntil: 'networkidle2' });
    await page.evaluate((t) => {
      localStorage.setItem('careid_access_token', t);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: 'bc6f6875-434c-4050-b893-07343cc27986',
        email: 'superadmin@careid.test',
        phone: '+16505550001',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
        permissions: ['*']
      }));
    }, token);

    await page.goto(`http://localhost:5174/admin/doctors/${testDoctorId}/map-facility`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.mapdoc-workspace-grid', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    // Check horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Horizontal Overflow = ${hasHorizontalOverflow}`);

    const filePath = path.join(OUTPUT_DIR, `mapdoc_${vp.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot: ${filePath}`);

    await page.close();
  }

  await browser.close();
  console.log('All responsive captures finished successfully!');
}

captureResponsiveUI().catch(err => {
  console.error('Responsive capture error:', err);
  process.exit(1);
});
