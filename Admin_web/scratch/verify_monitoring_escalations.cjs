const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 1024, filename: 'monitoring_desktop_1280.png' },
  { name: 'Laptop', width: 1366, height: 768, filename: 'monitoring_laptop_1366.png' },
  { name: 'Small_Desktop', width: 1024, height: 768, filename: 'monitoring_smalldesktop_1024.png' },
  { name: 'Mobile', width: 375, height: 812, filename: 'monitoring_mobile_375.png' },
];

async function runVerification() {
  console.log('🚀 Starting Verification for Referral Monitoring & Escalations Queue...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/admin/referrals/escalations`, { waitUntil: 'networkidle0' });

    // Wait for content
    await page.waitForSelector('.monitoring-heading-title', { timeout: 8000 });

    const measurements = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const sidebar = document.querySelector('.careid-sidebar');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const mainWrapper = document.querySelector('.monitoring-main-wrapper');
      const mainRect = mainWrapper ? mainWrapper.getBoundingClientRect() : null;
      const metricsGrid = document.querySelector('.monitoring-metrics-grid');
      const metricsRect = metricsGrid ? metricsGrid.getBoundingClientRect() : null;
      const tableWrapper = document.querySelector('.monitoring-table-wrapper');
      const tableRect = tableWrapper ? tableWrapper.getBoundingClientRect() : null;
      const table = document.querySelector('.monitoring-table');
      const rows = document.querySelectorAll('.monitoring-row');

      const isMobile = window.innerWidth < 1024;
      const gap = isMobile || !sidebarRect || !mainRect
        ? 0
        : Math.round(mainRect.left - sidebarRect.right);

      return {
        docScrollWidth,
        winInnerWidth,
        hasHorizontalPageOverflow: docScrollWidth > winInnerWidth,
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        sidebarRight: sidebarRect ? Math.round(sidebarRect.right) : 0,
        mainLeft: mainRect ? Math.round(mainRect.left) : 0,
        mainRight: mainRect ? Math.round(mainRect.right) : 0,
        gapBetweenSidebarAndMain: gap,
        metricsWithinBounds: metricsRect ? metricsRect.right <= winInnerWidth : false,
        tableWidth: table ? Math.round(table.getBoundingClientRect().width) : 0,
        tableRowsCount: rows.length,
      };
    });

    const screenshotPath = `${ARTIFACTS_DIR}\\${vp.filename}`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`✓ Saved screenshot: ${screenshotPath}`);

    results.push({
      viewport: vp.name,
      size: `${vp.width}x${vp.height}`,
      measurements,
    });
  }

  // Functional tests on Desktop: Search, Dialogs, Export
  console.log('\n--- Testing Functional Interactions on Desktop ---');
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto(`${BASE_URL}/admin/referrals/escalations`, { waitUntil: 'networkidle0' });

  // 1. Search Filter Test
  console.log('Testing Search for Eleanor Jensen...');
  const searchInput = await page.$('.monitoring-search-input');
  if (searchInput) {
    await searchInput.type('Eleanor');
    await new Promise(r => setTimeout(r, 200));
    const matchedRows = await page.$$eval('.monitoring-row', rows => rows.length);
    console.log(`✓ Search filtered rows to: ${matchedRows}`);
    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('.monitoring-search-input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 200));
  }

  // 2. Assign Admin Dialog Test
  console.log('Testing Assign Admin Dialog...');
  const assignBtn = await page.$('.monitoring-action-btn[title="Assign Administrator"]');
  if (assignBtn) {
    await assignBtn.click();
    await page.waitForSelector('.monitoring-modal-card', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));
    const modalTitle = await page.$eval('#assign-modal-title', el => el.innerText.trim());
    console.log(`✓ Assign Admin Modal opened: "${modalTitle}"`);
    await page.screenshot({ path: `${ARTIFACTS_DIR}\\monitoring_assign_dialog.png` });
    // Close modal
    await page.click('button[aria-label="Close"]');
    await new Promise(r => setTimeout(r, 300));
  }

  // 3. Clinical Notes Dialog Test
  console.log('Testing Clinical Notes Dialog...');
  const notesBtn = await page.$('.monitoring-action-btn[title="Clinical Notes & Attachments"]');
  if (notesBtn) {
    await notesBtn.click();
    await page.waitForSelector('.monitoring-modal-card', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));
    const modalTitle = await page.$eval('#notes-modal-title', el => el.innerText.trim());
    console.log(`✓ Clinical Notes Modal opened: "${modalTitle}"`);
    await page.screenshot({ path: `${ARTIFACTS_DIR}\\monitoring_notes_dialog.png` });
    // Close modal
    await page.click('button[aria-label="Close"]');
    await new Promise(r => setTimeout(r, 300));
  }

  // 4. Resolve SLA Dialog Test
  console.log('Testing Resolve SLA Dialog...');
  const resolveBtn = await page.$('.monitoring-action-btn[title="Resolve SLA Breach"]');
  if (resolveBtn) {
    await resolveBtn.click();
    await page.waitForSelector('.monitoring-modal-card', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));
    const modalTitle = await page.$eval('#resolve-modal-title', el => el.innerText.trim());
    console.log(`✓ Resolve SLA Modal opened: "${modalTitle}"`);
    await page.screenshot({ path: `${ARTIFACTS_DIR}\\monitoring_resolve_dialog.png` });
    // Close modal
    await page.click('button[aria-label="Close"]');
    await new Promise(r => setTimeout(r, 300));
  }

  // 5. OpenAPI Capability Notice Test
  console.log('Testing OpenAPI Capability Notice Dialog...');
  const historyBtn = await page.$('button[aria-label="History"]');
  if (historyBtn) {
    await historyBtn.click();
    await page.waitForSelector('.monitoring-modal-card', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 300));
    const capTitle = await page.$eval('#cap-modal-title', el => el.innerText.trim());
    console.log(`✓ Capability Notice Modal opened: "${capTitle}"`);
    await page.screenshot({ path: `${ARTIFACTS_DIR}\\monitoring_capability_dialog.png` });
    // Close modal
    await page.click('button[aria-label="Close"]');
    await new Promise(r => setTimeout(r, 300));
  }

  // 6. Navigation between Overview and Escalations
  console.log('Testing tab navigation back to Overview (/admin/referrals)...');
  await page.click('.monitoring-nav-tab');
  await page.waitForFunction(() => window.location.pathname === '/admin/referrals', { timeout: 5000 });
  console.log(`✓ Navigated to URL: ${page.url()}`);
  const overviewTitle = await page.$eval('.referral-top-title', el => el.innerText.trim());
  console.log(`✓ Referral Dashboard loaded: "${overviewTitle}"`);

  // Now click Escalations tab on Overview to navigate back
  const escalationsTab = await page.$('nav[aria-label="Referral sections"] button:nth-child(2)');
  if (escalationsTab) {
    await escalationsTab.click();
    await page.waitForFunction(() => window.location.pathname === '/admin/referrals/escalations', { timeout: 5000 });
    console.log(`✓ Navigated back to URL: ${page.url()}`);
  }

  await browser.close();

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
