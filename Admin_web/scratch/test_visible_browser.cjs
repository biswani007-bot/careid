const puppeteer = require('puppeteer-core');
const path = require('path');

async function testVisible() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('Testing visible Chrome browser launch with headless: false...');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5174/auth/login', { waitUntil: 'networkidle2' });
  const title = await page.title();
  console.log('Opened page with title:', title);

  const screenshotPath = path.join('D:', 'careid', 'Admin_web', 'docs', 'evidence', 'CAREID_VISIBLE_LIVE_E2E_005', 'phase_a_visible_check.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
  console.log('Visible browser test completed successfully.');
}

testVisible().catch(err => {
  console.error('Visible browser test error:', err);
  process.exit(1);
});
