const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'responsive_screenshots');
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function runBrowserVerification() {
  console.log('=== CAREID REPORTS DASHBOARD FILTERS E2E BROWSER VERIFICATION ===\n');
  const token = await getAdminToken();
  console.log('✓ Token ready');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Block heavy binary assets to keep navigation fast
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Navigate to login/set auth token
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2', timeout: 30000 });
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

  // Navigate to /admin/reports
  await page.goto('http://localhost:5174/admin/reports', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('.reports-kpi-card', { timeout: 30000 });

  async function getDashboardState() {
    await page.waitForFunction(() => {
      const val = document.querySelector('.reports-kpi-value')?.innerText?.trim();
      return val && !val.includes('...');
    }, { timeout: 15000 });

    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.reports-kpi-card'));
      const activeChips = Array.from(document.querySelectorAll('.reports-filter-chip')).map(c => c.innerText.trim());
      const kpis = cards.map(c => ({
        label: c.querySelector('.reports-kpi-label')?.innerText?.trim(),
        value: c.querySelector('.reports-kpi-value')?.innerText?.trim(),
        trend: c.querySelector('.reports-kpi-trend')?.innerText?.trim()
      }));
      return { kpis, activeChips };
    });
  }

  const results = [];

  // TEST 1: Today + All Hospitals + All Departments
  console.log('\n--- 1. Testing: Today + All Hospitals + All Departments ---');
  await delay(1000);
  let state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_01_today_all.png') });
  results.push({ test: '1. Today + All + All', ...state });

  // TEST 2: 7D + All Hospitals + All Departments
  console.log('\n--- 2. Testing: 7D + All Hospitals + All Departments ---');
  const btn7d = await page.waitForSelector('button.reports-time-btn:nth-child(2)');
  await btn7d.click();
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_02_7d_all.png') });
  results.push({ test: '2. 7D + All + All', ...state });

  // TEST 3: 30D + All Hospitals + All Departments
  console.log('\n--- 3. Testing: 30D + All Hospitals + All Departments ---');
  const btn30d = await page.waitForSelector('button.reports-time-btn:nth-child(3)');
  await btn30d.click();
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_03_30d_all.png') });
  results.push({ test: '3. 30D + All + All', ...state });

  // Reset to Today for Test 4
  const btnToday = await page.waitForSelector('button.reports-time-btn:nth-child(1)');
  await btnToday.click();
  await delay(1000);

  // TEST 4: Today + CAPITAL HOSPITAL + All Departments
  console.log('\n--- 4. Testing: Today + CAPITAL HOSPITAL + All Departments ---');
  // Click hospital dropdown
  const hospitalDropdownBtn = await page.waitForSelector('.reports-dropdown-container:nth-child(2) .reports-dropdown-btn');
  await hospitalDropdownBtn.click();
  await delay(500);
  // Select CAPITAL HOSPITAL
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.reports-dropdown-item'));
    const capitalItem = items.find(it => it.innerText.includes('CAPITAL HOSPITAL'));
    if (capitalItem) capitalItem.click();
  });
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_04_today_capital.png') });
  results.push({ test: '4. Today + CAPITAL + All', ...state });

  // Reset hospital to All for Test 5
  await hospitalDropdownBtn.click();
  await delay(500);
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.reports-dropdown-item'));
    const allItem = items.find(it => it.innerText.includes('All Hospitals'));
    if (allItem) allItem.click();
  });
  await delay(1000);

  // TEST 5: 7D + All Hospitals + Cardiology
  console.log('\n--- 5. Testing: 7D + All Hospitals + Cardiology ---');
  await btn7d.click();
  await delay(500);
  // Click department dropdown
  const deptDropdownBtn = await page.waitForSelector('.reports-dropdown-container:nth-child(3) .reports-dropdown-btn');
  await deptDropdownBtn.click();
  await delay(500);
  // Select Cardiology
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.reports-dropdown-item'));
    const cardioItem = items.find(it => it.innerText.includes('Cardiology'));
    if (cardioItem) cardioItem.click();
  });
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_05_7d_cardiology.png') });
  results.push({ test: '5. 7D + All + Cardiology', ...state });

  // TEST 6: 30D + CAPITAL HOSPITAL + Cardiology
  console.log('\n--- 6. Testing: 30D + CAPITAL HOSPITAL + Cardiology ---');
  await btn30d.click();
  await delay(500);
  // Select CAPITAL HOSPITAL
  await hospitalDropdownBtn.click();
  await delay(500);
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.reports-dropdown-item'));
    const capitalItem = items.find(it => it.innerText.includes('CAPITAL HOSPITAL'));
    if (capitalItem) capitalItem.click();
  });
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_06_30d_capital_cardiology.png') });
  results.push({ test: '6. 30D + CAPITAL + Cardiology', ...state });

  // TEST 7: Reset to all default filters
  console.log('\n--- 7. Testing: Reset to all default filters ---');
  const resetBtn = await page.waitForSelector('.reports-reset-btn');
  await resetBtn.click();
  await delay(1500);
  state = await getDashboardState();
  console.table(state.kpis);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'report_filter_07_reset_defaults.png') });
  results.push({ test: '7. Reset to Defaults', ...state });

  console.log('\n=== ALL 7 FILTER COMBINATION TESTS COMPLETED SUCCESSFULLY! ===');
  await browser.close();
}

runBrowserVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
