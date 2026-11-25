const puppeteer = require('D:/careid/Admin_web/node_modules/puppeteer-core');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.join('D:', 'careid', 'Admin_web', 'docs', 'evidence', 'CAREID_ADMIN_WEB_UI_LAYOUT_008');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureBefore() {
  console.log('=== CAPTURING BEFORE STATE FOR GOAL 008 ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();

  // Obtain auth token
  const otpReq = execSync('curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"+16505550001\\"}"').toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  const token = JSON.parse(verifyReq).data.accessToken;

  // Navigate to login first so origin is established
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });

  // Inject session into localStorage
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bbd2fede-a078-4ff0-a7ee-e7a4ec044461',
      email: 'superadmin@careid.test',
      fullName: 'Super Administrator',
      roles: ['ADMIN', 'SUPER_ADMIN'],
      primaryRole: 'SUPER_ADMIN'
    }));
  }, token);

  const targets = [
    { url: 'http://localhost:5174/admin/financing', name: 'before_01_financing', title: 'Healthcare Financing' },
    { url: 'http://localhost:5174/admin/operations/capacity', name: 'before_02_capacity', title: 'Capacity Monitoring' },
    { url: 'http://localhost:5174/admin/operations/prescriptions', name: 'before_03_prescriptions', title: 'Prescription Collection' }
  ];

  for (const target of targets) {
    console.log(`\nNavigating to ${target.url}...`);
    await page.goto(target.url, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Analyze DOM positions
    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;

      // Active sidebar items
      const activeItems = Array.from(document.querySelectorAll('.careid-sidebar .active')).map(el => {
        return {
          text: el.innerText.trim().replace(/\n/g, ' '),
          tag: el.tagName,
          classes: el.className
        };
      });

      // Main content
      const main = document.querySelector('main, .financing-main, .capacity-main, .rx-pickup-main');
      const mainRect = main ? main.getBoundingClientRect() : null;

      // Heading
      const heading = document.querySelector('h1, h2, .financing-page-title, .capacity-page-title, .rx-pickup-page-title');
      const headingRect = heading ? heading.getBoundingClientRect() : null;

      // First Card
      const card = document.querySelector('.financing-kpi-card, .capacity-metric-card, .rx-pickup-kpi-card, .kpi-card');
      const cardRect = card ? card.getBoundingClientRect() : null;

      // Search input
      const search = document.querySelector('input[type="text"], input[type="search"], .search-input');
      const searchRect = search ? search.getBoundingClientRect() : null;

      return {
        sidebarWidth: sidebarRect ? sidebarRect.width : null,
        mainLeft: mainRect ? mainRect.left : null,
        headingLeft: headingRect ? headingRect.left : null,
        cardLeft: cardRect ? cardRect.left : null,
        searchLeft: searchRect ? searchRect.left : null,
        activeItems
      };
    });

    console.log(`Metrics for ${target.title}:`, JSON.stringify(metrics, null, 2));

    const screenshotPath = path.join(EVIDENCE_DIR, `${target.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved screenshot to ${screenshotPath}`);
  }

  await browser.close();
  console.log('\n=== BEFORE STATE CAPTURE COMPLETED ===');
}

captureBefore().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
