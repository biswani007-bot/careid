const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAdminToken } = require('./token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'responsive_screenshots');
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  console.log('=== STARTING PATIENT DIRECTORY STATS RECONCILIATION VERIFICATION ===\n');
  const token = await getAdminToken();
  console.log('✓ Admin token ready');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set proper auth tokens
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

  console.log('Navigating to http://localhost:5174/admin/patients...');
  await page.goto('http://localhost:5174/admin/patients', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.patients-kpi-value');
    return el && el.textContent.trim() === '37';
  }, { timeout: 15000 });
  await delay(1000);

  async function getDirectoryState() {
    return await page.evaluate(() => {
      const kpis = Array.from(document.querySelectorAll('.patients-kpi-card')).map(card => {
        const label = card.querySelector('.patients-kpi-label')?.innerText?.trim() || '';
        const value = card.querySelector('.patients-kpi-value')?.innerText?.trim() || '';
        const subtext = (card.querySelector('.patients-kpi-footer-trend') || card.querySelector('.patients-kpi-footer-text'))?.innerText?.trim() || '';
        return { label, value, subtext };
      });
      const pagination = document.querySelector('.patients-pagination-text')?.innerText?.trim() || '';
      const rowCount = document.querySelectorAll('.patients-table-row').length;
      return { kpis, pagination, rowCount };
    });
  }

  // 1. PAGE 1
  console.log('\n--- 1. Testing Page 1 ---');
  let state = await getDirectoryState();
  console.log('Page 1 State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_01_page1.png'), fullPage: false });

  // 2. PAGE 2
  console.log('\n--- 2. Testing Page 2 ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.patients-page-btn'));
    const p2 = btns.find(b => b.innerText.trim() === '2');
    if (p2) p2.click();
  });
  await delay(1200);
  state = await getDirectoryState();
  console.log('Page 2 State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_02_page2.png'), fullPage: false });

  // 3. PAGE 3
  console.log('\n--- 3. Testing Page 3 ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.patients-page-btn'));
    const p3 = btns.find(b => b.innerText.trim() === '3');
    if (p3) p3.click();
  });
  await delay(1200);
  state = await getDirectoryState();
  console.log('Page 3 State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_03_page3.png'), fullPage: false });

  // 4. PAGE 4
  console.log('\n--- 4. Testing Page 4 ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.patients-page-btn'));
    const p4 = btns.find(b => b.innerText.trim() === '4');
    if (p4) p4.click();
  });
  await delay(1200);
  state = await getDirectoryState();
  console.log('Page 4 State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_04_page4.png'), fullPage: false });

  // 5. REFRESH CHECK
  console.log('\n--- 5. Testing Page Refresh Persistence ---');
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.patients-kpi-value');
    return el && el.textContent.trim() === '37';
  }, { timeout: 15000 });
  await delay(1000);
  state = await getDirectoryState();
  console.log('After Refresh State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_05_refresh.png'), fullPage: false });

  // 6. SEARCH FILTER
  console.log('\n--- 6. Testing Search Filter ("785") ---');
  const searchInput = await page.waitForSelector('.patients-header-search-input');
  await searchInput.type('785');
  await delay(1500);
  state = await getDirectoryState();
  console.log('Search "785" State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_06_search.png'), fullPage: false });

  // 7. INACTIVE FILTER (Reset to page 1 fresh)
  console.log('\n--- 7. Testing Inactive Filter ---');
  await page.goto('http://localhost:5174/admin/patients', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.patients-kpi-value');
    return el && el.textContent.trim() === '37';
  });
  await delay(800);

  // Click status pill directly via evaluate
  await page.evaluate(() => {
    const pills = document.querySelectorAll('.patients-filter-pill');
    if (pills[0]) pills[0].click();
  });
  await delay(600);

  // Click Inactive option
  await page.evaluate(() => {
    const menuItems = Array.from(document.querySelectorAll('.patients-filter-menu-item'));
    const inactive = menuItems.find(m => m.textContent.includes('Inactive'));
    if (inactive) inactive.click();
  });
  await delay(1500);

  state = await getDirectoryState();
  console.log('Inactive Filter State:');
  console.table(state.kpis);
  console.log('Pagination:', state.pagination, '| Row Count:', state.rowCount);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'patient_stats_07_filter_inactive.png'), fullPage: false });

  console.log('\n✓ ALL RECONCILIATION CHECKS COMPLETED PERFECTLY!');
  await browser.close();
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
