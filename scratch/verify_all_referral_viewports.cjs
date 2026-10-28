const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyAllReferralViewports() {
  console.log('🚀 Starting Comprehensive 4-Viewport Verification for CareID Referral Dashboard...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.toString() });
  });

  const viewports = [
    { name: 'Desktop', width: 1280, height: 1024, filename: 'referral_desktop_1280.png' },
    { name: 'Laptop', width: 1366, height: 768, filename: 'referral_laptop_1366.png' },
    { name: 'Small_Desktop', width: 1024, height: 768, filename: 'referral_smalldesktop_1024.png' },
    { name: 'Mobile', width: 375, height: 812, filename: 'referral_mobile_375.png' },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\nTesting ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.width === 375 ? 2 : 1 });
    await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.referral-table-card', { timeout: 10000 });

    const measurements = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const sidebar = document.querySelector('.careid-sidebar');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const main = document.querySelector('.referral-main-wrapper') || document.querySelector('.careid-main-wrapper');
      const mainRect = main ? main.getBoundingClientRect() : null;
      const tableWrapper = document.querySelector('.referral-table-wrapper');
      const table = document.querySelector('.referral-table');

      // Check card bounds
      const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
      const cardsInBounds = cards.every((c) => {
        const r = c.getBoundingClientRect();
        return r.right <= mainRect.right + 2;
      });

      // Check toolbar bounds
      const toolbar = document.querySelector('.referral-toolbar');
      const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
      const toolbarInBounds = toolbarRect ? toolbarRect.right <= mainRect.right + 2 : true;

      // Check export button bounds
      const exportBtn = document.querySelector('.referral-export-btn');
      const exportBtnRect = exportBtn ? exportBtn.getBoundingClientRect() : null;
      const exportBtnInBounds = exportBtnRect ? exportBtnRect.right <= mainRect.right + 2 : true;

      return {
        docScrollWidth,
        winInnerWidth,
        hasHorizontalPageOverflow: docScrollWidth > winInnerWidth,
        sidebarWidth: sidebarRect ? sidebarRect.width : 0,
        sidebarRight: sidebarRect ? sidebarRect.right : 0,
        mainLeft: mainRect ? mainRect.left : 0,
        mainRight: mainRect ? mainRect.right : 0,
        mainWidth: mainRect ? mainRect.width : 0,
        gapBetweenSidebarAndMain: mainRect && sidebarRect ? mainRect.left - sidebarRect.right : 0,
        cardsInBounds,
        toolbarInBounds,
        exportBtnInBounds,
        tableScrollable: tableWrapper ? tableWrapper.scrollWidth > tableWrapper.clientWidth : false,
        tableWidth: table ? table.offsetWidth : 0,
      };
    });

    const screenshotPath = path.join(ARTIFACTS_DIR, vp.filename);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ Saved screenshot: ${screenshotPath}`);

    results.push({ viewport: vp.name, size: `${vp.width}x${vp.height}`, measurements });
  }

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

verifyAllReferralViewports();
