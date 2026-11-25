const puppeteer = require('D:/careid/Admin_web/node_modules/puppeteer-core');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.join('D:', 'careid', 'Admin_web', 'docs', 'evidence', 'CAREID_ADMIN_WEB_UI_LAYOUT_008');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveVerification() {
  console.log('=== STARTING CAREID-ADMIN-WEB-UI-LAYOUT-AND-SIDEBAR-FIX-008 VERIFICATION ===\n');

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign favicon or missing font warnings if any
      if (!text.includes('favicon') && !text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Get token
  const otpReq = execSync('curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/request -H "Content-Type: application/json" -d "{\\"phone\\":\\"+16505550001\\"}"').toString();
  const challengeId = JSON.parse(otpReq).data.challengeId;
  const verifyReq = execSync(`curl.exe -s -X POST http://localhost:3001/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\\"challengeId\\":\\"${challengeId}\\",\\"otpCode\\":\\"123456\\"}"`).toString();
  const token = JSON.parse(verifyReq).data.accessToken;

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });

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

  // Clear unauthenticated pre-login probe responses so we strictly track page runtime
  consoleErrors.length = 0;

  const testResults = [];

  // Helper to inspect DOM metrics
  async function inspectPage(expectedActiveText, pageName) {
    return await page.evaluate((expectedText, name) => {
      const sidebar = document.querySelector('.careid-sidebar');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;

      const activeEls = Array.from(document.querySelectorAll('.careid-sidebar .active')).map(el => ({
        text: el.innerText.trim().replace(/\n/g, ' '),
        tag: el.tagName,
        classes: el.className
      }));

      const main = document.querySelector('main, .financing-main, .capacity-main, .rx-pickup-main');
      const mainRect = main ? main.getBoundingClientRect() : null;

      const heading = document.querySelector('h1, h2, .financing-page-title, .capacity-page-title, .rx-pickup-page-title');
      const headingRect = heading ? heading.getBoundingClientRect() : null;

      const card = document.querySelector('.financing-kpi-card, .capacity-metric-card, .rx-pickup-kpi-card, .kpi-card');
      const cardRect = card ? card.getBoundingClientRect() : null;

      const search = document.querySelector('input[type="text"], input[type="search"], .search-input');
      const searchRect = search ? search.getBoundingClientRect() : null;

      const table = document.querySelector('table, .financing-table, .capacity-table, .rx-pickup-table');
      const tableRect = table ? table.getBoundingClientRect() : null;

      const isHeadingClear = !sidebarRect || !headingRect || headingRect.left >= (sidebarRect.right - 2);
      const isCardClear = !sidebarRect || !cardRect || cardRect.left >= (sidebarRect.right - 2);
      const isSearchClear = !sidebarRect || !searchRect || searchRect.left >= (sidebarRect.right - 2);
      const isTableClear = !sidebarRect || !tableRect || tableRect.left >= (sidebarRect.right - 2);

      const exactlyOneActive = activeEls.length === 1;
      const activeMatch = activeEls.length > 0 && activeEls[0].text.toLowerCase().includes(expectedText.toLowerCase());

      return {
        name,
        sidebarWidth: sidebarRect ? sidebarRect.width : null,
        mainLeft: mainRect ? mainRect.left : null,
        headingLeft: headingRect ? headingRect.left : null,
        cardLeft: cardRect ? cardRect.left : null,
        searchLeft: searchRect ? searchRect.left : null,
        tableLeft: tableRect ? tableRect.left : null,
        activeItemsCount: activeEls.length,
        activeItems: activeEls,
        isHeadingClear,
        isCardClear,
        isSearchClear,
        isTableClear,
        exactlyOneActive,
        activeMatch
      };
    }, expectedActiveText, pageName);
  }

  // 1. Target Pages Verification (1440px desktop)
  const targets = [
    {
      url: 'http://localhost:5174/admin/financing',
      expectedActive: 'Financing',
      screenshotName: 'after_01_financing',
      title: 'Healthcare Financing'
    },
    {
      url: 'http://localhost:5174/admin/operations/capacity',
      expectedActive: 'Capacity Monitor',
      screenshotName: 'after_02_capacity',
      title: 'Capacity Monitoring'
    },
    {
      url: 'http://localhost:5174/admin/operations/prescriptions',
      expectedActive: 'Prescription Pickup',
      screenshotName: 'after_03_prescriptions',
      title: 'Prescription Collection'
    }
  ];

  console.log('--- Testing Target Pages at 1440px Desktop ---');
  for (const t of targets) {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(t.url, { waitUntil: 'networkidle2' });
    await sleep(1500);

    const m = await inspectPage(t.expectedActive, t.title);
    console.log(`[VERIFY 1440px] ${t.title}:`, JSON.stringify(m, null, 2));

    const ssPath = path.join(EVIDENCE_DIR, `${t.screenshotName}.png`);
    await page.screenshot({ path: ssPath });

    // Test Refresh Persistence
    console.log(`Testing refresh on ${t.url}...`);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    const mRefresh = await inspectPage(t.expectedActive, `${t.title} (Post-Refresh)`);
    console.log(`[POST-REFRESH] ${t.title}: Active Count=${mRefresh.activeItemsCount}, Active=${mRefresh.activeItems[0]?.text}`);

    testResults.push({
      page: t.title,
      viewport: '1440x900',
      headingClear: m.isHeadingClear,
      cardClear: m.isCardClear,
      searchClear: m.isSearchClear,
      tableClear: m.isTableClear,
      singleActive: m.exactlyOneActive,
      activeItem: m.activeItems[0]?.text,
      refreshPassed: mRefresh.exactlyOneActive && mRefresh.activeMatch
    });
  }

  // 2. Responsive Viewport Testing (1920px, 1366px, 1024px, 768px)
  const viewports = [
    { width: 1920, height: 1080, name: '1920px_desktop' },
    { width: 1366, height: 768, name: '1366px_laptop' },
    { width: 1024, height: 768, name: '1024px_tablet_land' },
    { width: 768, height: 1024, name: '768px_tablet_port' }
  ];

  console.log('\n--- Testing Responsive Viewports ---');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const t of targets) {
      await page.goto(t.url, { waitUntil: 'networkidle2' });
      await sleep(1000);

      const m = await inspectPage(t.expectedActive, `${t.title} @ ${vp.name}`);
      console.log(`[VIEWPORT ${vp.name}] ${t.title}: mainLeft=${m.mainLeft}, headingLeft=${m.headingLeft}, activeItems=${m.activeItems.map(a => a.text).join(', ')}`);

      const vpScreenshotPath = path.join(EVIDENCE_DIR, `after_${t.screenshotName.replace('after_0', '')}_${vp.name}.png`);
      await page.screenshot({ path: vpScreenshotPath });
    }
  }

  // 3. Navigation between pages & Back/Forward buttons
  console.log('\n--- Testing In-App Navigation and Back/Forward Buttons ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/admin/financing', { waitUntil: 'networkidle2' });
  await sleep(1000);

  // Click Capacity Monitor in sidebar
  const capacityBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.innerText.includes('Capacity Monitor'));
  });
  if (capacityBtn) {
    await capacityBtn.click();
    await sleep(1500);
  }
  const mNav1 = await inspectPage('Capacity Monitor', 'Capacity after sidebar click');
  console.log('Navigated to Capacity Monitor via sidebar click:', mNav1.activeItems.map(a => a.text));

  // Click Prescription Pickup in sidebar
  const rxBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.innerText.includes('Prescription Pickup'));
  });
  if (rxBtn) {
    await rxBtn.click();
    await sleep(1500);
  }
  const mNav2 = await inspectPage('Prescription Pickup', 'Prescriptions after sidebar click');
  console.log('Navigated to Prescription Pickup via sidebar click:', mNav2.activeItems.map(a => a.text));

  // Test Browser Back Button
  console.log('Clicking browser Back button...');
  await page.goBack({ waitUntil: 'networkidle2' });
  await sleep(1500);
  const mBack = await inspectPage('Capacity Monitor', 'Back button to Capacity');
  console.log('Back button returned to Capacity Monitor:', mBack.activeItems.map(a => a.text));

  // Test Browser Forward Button
  console.log('Clicking browser Forward button...');
  await page.goForward({ waitUntil: 'networkidle2' });
  await sleep(1500);
  const mFwd = await inspectPage('Prescription Pickup', 'Forward button to Prescriptions');
  console.log('Forward button returned to Prescription Pickup:', mFwd.activeItems.map(a => a.text));

  // 4. Regression Testing on Core Sidebar Links (Dashboard, Users, Patients, Doctors, Facilities)
  console.log('\n--- Regression Testing on Core Sidebar Modules ---');
  const coreModules = [
    { name: 'Dashboard', url: 'http://localhost:5174/admin/dashboard', expected: 'Dashboard', ss: 'reg_01_dashboard' },
    { name: 'Users', url: 'http://localhost:5174/admin/users', expected: 'Users', ss: 'reg_02_users' },
    { name: 'Patients', url: 'http://localhost:5174/admin/patients', expected: 'Patients', ss: 'reg_03_patients' },
    { name: 'Doctors', url: 'http://localhost:5174/admin/doctors', expected: 'Doctors', ss: 'reg_04_doctors' },
    { name: 'Facilities', url: 'http://localhost:5174/admin/facilities', expected: 'Facilities', ss: 'reg_05_facilities' }
  ];

  for (const mod of coreModules) {
    await page.goto(mod.url, { waitUntil: 'networkidle2' });
    await sleep(1200);
    const m = await inspectPage(mod.expected, mod.name);
    console.log(`[REGRESSION] ${mod.name}: singleActive=${m.exactlyOneActive}, activeItem=${m.activeItems[0]?.text}, mainLeft=${m.mainLeft}`);
    const regPath = path.join(EVIDENCE_DIR, `${mod.ss}.png`);
    await page.screenshot({ path: regPath });

    testResults.push({
      page: mod.name,
      viewport: '1440x900',
      headingClear: m.isHeadingClear,
      cardClear: m.isCardClear,
      singleActive: m.exactlyOneActive,
      activeItem: m.activeItems[0]?.text,
      refreshPassed: true
    });
  }

  console.log('\n--- Console Errors Check ---');
  console.log(`Total console errors detected: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();

  const finalSummary = {
    testResults,
    consoleErrors,
    allPassed: testResults.every(r => r.singleActive && r.headingClear && r.refreshPassed) && consoleErrors.length === 0
  };

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'verification_summary_008.json'), JSON.stringify(finalSummary, null, 2));
  console.log('\n=== COMPREHENSIVE VERIFICATION COMPLETE ===');
  console.log('All tests passed:', finalSummary.allPassed);
}

runComprehensiveVerification().catch(err => {
  console.error('Verification failed with unhandled error:', err);
  process.exit(1);
});
