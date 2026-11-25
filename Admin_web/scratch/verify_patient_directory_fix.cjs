const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAdminToken } = require('./token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'responsive_screenshots');
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function runTest() {
  console.log('=== CAREID PATIENT DIRECTORY FIX VERIFICATION ===\n');
  const token = await getAdminToken();
  console.log('✓ Admin token ready');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor network requests
  const networkLogs = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/')) {
      networkLogs.push({
        url: url.split('?')[0].replace('https://360api.vnvision.in', ''),
        fullUrl: url.replace('https://360api.vnvision.in', ''),
        status: res.status(),
        method: res.request().method()
      });
    }
  });

  // Block heavy assets
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['font', 'media'].includes(req.resourceType())) {
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

  // 1. Navigate to /admin/patients
  console.log('\n--- 1. Navigating to /admin/patients ---');
  await page.goto('http://localhost:5174/admin/patients', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('.patients-table-row', { timeout: 30000 });
  await delay(1500);

  // Check network calls
  console.log('\nBackend API Calls made:');
  const relevantCalls = networkLogs.filter(n => n.url.includes('admin/users') || n.url.includes('stats') || n.url.includes('patients'));
  relevantCalls.forEach(c => console.log(`  ${c.method} ${c.fullUrl} -> HTTP ${c.status}`));

  // Extract KPI values
  const kpis = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.patients-kpi-card'));
    return cards.map(c => ({
      label: c.querySelector('.patients-kpi-label')?.innerText?.trim(),
      value: c.querySelector('.patients-kpi-value')?.innerText?.trim(),
      subtext: (c.querySelector('.patients-kpi-footer-trend') || c.querySelector('.patients-kpi-footer-text'))?.innerText?.trim()
    }));
  });
  console.log('\nKPI Summary Cards:');
  console.table(kpis);

  // Extract Table Rows
  const tableRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.patients-table-row'));
    return rows.map(r => {
      const nameBox = r.querySelector('.patients-name-box');
      return {
        name: nameBox?.querySelector('.patients-name')?.innerText?.trim(),
        phone: nameBox?.querySelector('.patients-phone')?.innerText?.trim(),
        vaultId: r.querySelector('.patients-vault-id')?.innerText?.trim(),
        registered: r.querySelector('.patients-text-date')?.innerText?.trim(),
        verification: r.querySelector('.patients-badge-verification')?.innerText?.trim(),
        status: r.querySelector('.patients-badge-status')?.innerText?.trim()
      };
    });
  });
  console.log(`\nTable Patients on Page 1 (Count: ${tableRows.length}):`);
  console.table(tableRows.slice(0, 5));

  // Extract Pagination
  const paginationText = await page.evaluate(() => {
    return document.querySelector('.patients-pagination-info')?.innerText?.trim() ||
      document.querySelector('.patients-pagination')?.innerText?.trim();
  });
  console.log('\nPagination Info:', paginationText);

  // Take Screenshot 1: Default Patient Directory
  const ss1 = path.join(SCREENSHOT_DIR, 'patient_directory_01_loaded.png');
  await page.screenshot({ path: ss1 });
  console.log('✓ Captured screenshot 1:', ss1);

  // 2. Test Search by Phone
  console.log('\n--- 2. Testing Search by Phone ("78524163985") ---');
  const searchInput = await page.waitForSelector('.patients-header-search-input');
  await searchInput.type('78524163985');
  await delay(1500);

  const searchRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.patients-table-row'));
    return rows.map(r => ({
      phone: r.querySelector('.patients-phone')?.innerText?.trim(),
      vaultId: r.querySelector('.patients-vault-id')?.innerText?.trim(),
      verification: r.querySelector('.patients-badge-verification')?.innerText?.trim()
    }));
  });
  console.log('Search Results:', searchRows);

  const ss2 = path.join(SCREENSHOT_DIR, 'patient_directory_02_search.png');
  await page.screenshot({ path: ss2 });
  console.log('✓ Captured screenshot 2:', ss2);

  // Clear search input
  await searchInput.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await delay(1500);

  // 3. Test Filter by Status: Inactive
  console.log('\n--- 3. Testing Filter by Status: Inactive ---');
  // Click status pill
  const statusPill = await page.waitForSelector('.patients-filter-pill:nth-child(1)');
  await statusPill.click();
  await delay(500);
  // Click 'Inactive' option in dropdown
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.patients-filter-option'));
    const inactive = items.find(it => it.innerText.includes('Inactive'));
    if (inactive) inactive.click();
  });
  await delay(1500);

  const inactiveRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.patients-table-row'));
    return rows.map(r => ({
      phone: r.querySelector('.patients-phone')?.innerText?.trim(),
      status: r.querySelector('.patients-badge-status')?.innerText?.trim()
    }));
  });
  console.log('Inactive filter results count:', inactiveRows.length, inactiveRows);

  const ss3 = path.join(SCREENSHOT_DIR, 'patient_directory_03_filter_inactive.png');
  await page.screenshot({ path: ss3 });
  console.log('✓ Captured screenshot 3:', ss3);

  // 4. Test Page Refresh & Persistence
  console.log('\n--- 4. Testing Refresh Persistence ---');
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('.patients-table-row', { timeout: 30000 });
  await delay(1500);

  const reloadedCount = await page.evaluate(() => {
    return document.querySelectorAll('.patients-table-row').length;
  });
  console.log(`✓ Page reloaded successfully! Table rows rendered: ${reloadedCount}`);

  const ss4 = path.join(SCREENSHOT_DIR, 'patient_directory_04_refresh.png');
  await page.screenshot({ path: ss4 });
  console.log('✓ Captured screenshot 4:', ss4);

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ===');
  await browser.close();
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
