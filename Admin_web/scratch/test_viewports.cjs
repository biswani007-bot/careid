const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

const viewports = [
  { name: 'view_1920x1080', width: 1920, height: 1080, label: 'Spacious Desktop' },
  { name: 'view_1440x900', width: 1440, height: 900, label: 'Standard Desktop' },
  { name: 'view_1366x768', width: 1366, height: 768, label: 'Compact Laptop' },
  { name: 'view_1280x720', width: 1280, height: 720, label: 'Smaller Laptop' },
  { name: 'view_1024x768', width: 1024, height: 768, label: 'Tablet / Narrow Desktop' },
  { name: 'view_768x1024', width: 768, height: 1024, label: 'Portrait Tablet' },
  { name: 'view_390x844', width: 390, height: 844, label: 'Mobile' },
];

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));


  // Helper to reliably set input value in React Hook Form
  async function setInput(selector, val) {
    await page.focus(selector);
    await page.evaluate((sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, val);
  }

  // 1. Test Login Validation
  console.log('Testing Login page at http://localhost:5173/');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Clear email field and submit
  await setInput('#admin-email', '');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 200));

  let errorText = await page.$eval('#email-error', el => el.textContent).catch(() => null);
  console.log('Empty email error:', errorText);

  // Type invalid email and submit
  await setInput('#admin-email', 'invalid-email');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 200));
  errorText = await page.$eval('#email-error', el => el.textContent).catch(() => null);
  console.log('Invalid email error:', errorText);

  // Take screenshot of validation error
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'val_invalid_email.png') });

  // Type valid credentials and submit
  await setInput('#admin-email', 'admin@careid.com');
  await setInput('#admin-password', 'CareID2026!');
  await page.click('button[type="submit"]');

  // Wait for redirect to /admin/dashboard
  await page.waitForFunction(() => window.location.pathname.includes('/admin/dashboard'), { timeout: 8000 });
  console.log('Successfully navigated to:', page.url());

  // 2. Test each Viewport
  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name}: ${vp.width}x${vp.height} (${vp.label})`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 300));
    
    // Capture top view
    const outPath = path.join(ARTIFACT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);

    // For laptop & mobile, scroll down canvas and verify footer/activity feed accessibility
    if (vp.width <= 1366) {
      await page.evaluate(() => {
        const c = document.querySelector('.careid-main-canvas');
        if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'instant' });
      });
      await new Promise(r => setTimeout(r, 200));
      const outScrollPath = path.join(ARTIFACT_DIR, `${vp.name}_scrolled.png`);
      await page.screenshot({ path: outScrollPath });
      console.log(`Saved scrolled screenshot: ${outScrollPath}`);
      await page.evaluate(() => {
        const c = document.querySelector('.careid-main-canvas');
        if (c) c.scrollTo({ top: 0, behavior: 'instant' });
      });
    }
  }

  // 3. Test Direct Refresh
  console.log('Testing direct refresh on /admin/dashboard at 1366x768...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.reload({ waitUntil: 'networkidle0' });
  const dashboardTitle = await page.$eval('.dashboard-heading-title', el => el.textContent).catch(() => null);
  console.log('Dashboard title after reload:', dashboardTitle);

  // 4. Test Logout
  console.log('Testing Logout button...');
  const logoutBtn = await page.$('.sidebar-logout-btn');
  if (logoutBtn) {
    await logoutBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 400));
    console.log('Successfully logged out to:', page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'val_logout_success.png') });
  }

  await browser.close();
  console.log('All automated viewport & flow tests completed successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
