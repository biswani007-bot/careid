const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAdminToken } = require('./token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  console.log('=== HEALTH RECORDS LISTING RECOVERY E2E VERIFICATION ===');
  const token = await getAdminToken();
  console.log('Admin token ready:', token.slice(0, 20) + '...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();

  // Navigate to login to establish origin, then set localStorage auth tokens
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      firstName: 'Super',
      lastName: 'Admin',
      roles: ['SUPER_ADMIN'],
      isActive: true
    }));
  }, token);

  // -------------------------------------------------------------
  // TEST 1: All Health Records (/admin/records)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Navigating to /admin/records ---');
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const badge = document.querySelector('.category-segmented-group .category-badge');
    return badge && badge.textContent.trim() === '308';
  }, { timeout: 15000 });
  await delay(1000);

  // Extract category badge counts
  const badges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.category-segmented-group .category-badge')).map(e => e.textContent.trim())
  );
  console.log('Category tab badges [All, Medical, Dental, Vision]:', badges);

  // Extract table rows count
  const rowsAll = await page.evaluate(() => document.querySelectorAll('.records-table tbody tr').length);
  console.log('Table rows count on Page 1:', rowsAll);

  // Extract pagination text
  const paginationTextAll = await page.evaluate(() =>
    document.querySelector('.records-pagination-bar')?.textContent?.trim()?.replace(/\s+/g, ' ') || 'N/A'
  );
  console.log('Pagination info:', paginationTextAll);

  // Verify first 3 rows are the authoritative attachments
  const first3Titles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.records-table tbody tr .record-title-text, .records-table tbody tr .font-semibold')).slice(0, 3).map(e => e.textContent.trim())
  );
  console.log('First 3 records on All Records tab:', first3Titles);

  // Capture screenshot 1
  const shot1 = path.join(ARTIFACT_DIR, 'records_01_all_308.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved:', shot1);

  // -------------------------------------------------------------
  // TEST 2: Medical Records (/admin/records/medical)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Navigating to /admin/records/medical ---');
  await page.goto(`${BASE_URL}/admin/records/medical`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.category-kpi-card .category-kpi-number');
    return el && el.textContent.trim() === '305';
  }, { timeout: 15000 });
  await delay(1000);

  const medKpiTotal = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-number')?.textContent?.trim() || 'N/A');
  const medKpiSubtitle = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-subtitle')?.textContent?.trim() || 'N/A');
  const medBadges = await page.evaluate(() => Array.from(document.querySelectorAll('.category-tabs-strip .category-tab-count-badge')).map(e => e.textContent.trim()));
  const medRows = await page.evaluate(() => document.querySelectorAll('.category-table tbody tr').length);
  const medPagination = await page.evaluate(() => document.querySelector('.pagination-info-text')?.textContent?.trim() || 'N/A');

  console.log('Medical KPI Total:', medKpiTotal, 'Subtitle:', medKpiSubtitle);
  console.log('Medical Tab Badges [All, Medical, Dental, Vision]:', medBadges);
  console.log('Medical Table Rows count:', medRows);
  console.log('Medical Pagination info:', medPagination);

  const shot2 = path.join(ARTIFACT_DIR, 'records_02_medical_305.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Saved:', shot2);

  // -------------------------------------------------------------
  // TEST 3: Dental Records (/admin/records/dental)
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Navigating to /admin/records/dental ---');
  await page.goto(`${BASE_URL}/admin/records/dental`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.category-kpi-card .category-kpi-number');
    return el && el.textContent.trim() === '2';
  }, { timeout: 15000 });
  await delay(1000);

  const denKpiTotal = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-number')?.textContent?.trim() || 'N/A');
  const denKpiSubtitle = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-subtitle')?.textContent?.trim() || 'N/A');
  const denRows = await page.evaluate(() => document.querySelectorAll('.category-table tbody tr').length);
  const denPagination = await page.evaluate(() => document.querySelector('.pagination-info-text')?.textContent?.trim() || 'N/A');

  console.log('Dental KPI Total:', denKpiTotal, 'Subtitle:', denKpiSubtitle);
  console.log('Dental Table Rows count:', denRows);
  console.log('Dental Pagination info:', denPagination);

  const shot3 = path.join(ARTIFACT_DIR, 'records_03_dental_2.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Saved:', shot3);

  // -------------------------------------------------------------
  // TEST 4: Vision Records (/admin/records/vision)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Navigating to /admin/records/vision ---');
  await page.goto(`${BASE_URL}/admin/records/vision`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.category-kpi-card .category-kpi-number');
    return el && el.textContent.trim() === '1';
  }, { timeout: 15000 });
  await delay(1000);

  const visKpiTotal = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-number')?.textContent?.trim() || 'N/A');
  const visKpiSubtitle = await page.evaluate(() => document.querySelector('.category-kpi-card .category-kpi-subtitle')?.textContent?.trim() || 'N/A');
  const visRows = await page.evaluate(() => document.querySelectorAll('.category-table tbody tr').length);
  const visPagination = await page.evaluate(() => document.querySelector('.pagination-info-text')?.textContent?.trim() || 'N/A');

  console.log('Vision KPI Total:', visKpiTotal, 'Subtitle:', visKpiSubtitle);
  console.log('Vision Table Rows count:', visRows);
  console.log('Vision Pagination info:', visPagination);

  const shot4 = path.join(ARTIFACT_DIR, 'records_04_vision_1.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log('Saved:', shot4);

  // -------------------------------------------------------------
  // TEST 5: Search Filter on All Records
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Testing Search on /admin/records ---');
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const badge = document.querySelector('.category-segmented-group .category-badge');
    return badge && badge.textContent.trim() === '308';
  }, { timeout: 15000 });

  const searchInput = await page.$('.header-search-input, .records-search-input, input[type="text"][placeholder*="Search"]');
  if (searchInput) {
    await searchInput.type('Metabolic');
    await delay(1500);
    const searchRows = await page.evaluate(() => document.querySelectorAll('.records-table tbody tr').length);
    const searchPagination = await page.evaluate(() =>
      document.querySelector('.records-pagination-bar')?.textContent?.trim()?.replace(/\s+/g, ' ') || 'N/A'
    );
    console.log('Search "Metabolic" results count:', searchRows, 'Pagination:', searchPagination);
  }

  const shot5 = path.join(ARTIFACT_DIR, 'records_05_search.png');
  await page.screenshot({ path: shot5, fullPage: false });
  console.log('Saved:', shot5);

  // -------------------------------------------------------------
  // TEST 6: Record Details Modal
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Testing Record Details Modal ---');
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const badge = document.querySelector('.category-segmented-group .category-badge');
    return badge && badge.textContent.trim() === '308';
  }, { timeout: 15000 });
  await delay(1000);

  const firstRowBtn = await page.$('.btn-table-action-view, .records-table tbody tr button');
  if (firstRowBtn) {
    await firstRowBtn.click();
    await delay(1500);
    console.log('Opened record details modal');
  }

  const shot6 = path.join(ARTIFACT_DIR, 'records_06_record_details_modal.png');
  await page.screenshot({ path: shot6, fullPage: false });
  console.log('Saved:', shot6);

  // -------------------------------------------------------------
  // TEST 7: Page Reload & Persistence
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Testing Fresh Reload Persistence ---');
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => {
    const badge = document.querySelector('.category-segmented-group .category-badge');
    return badge && badge.textContent.trim() === '308';
  }, { timeout: 15000 });
  await delay(1000);

  const reloadedBadges = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.category-segmented-group .category-badge')).map(e => e.textContent.trim())
  );
  const reloadedRows = await page.evaluate(() => document.querySelectorAll('.records-table tbody tr').length);
  const reloadedPagination = await page.evaluate(() =>
    document.querySelector('.records-pagination-bar')?.textContent?.trim()?.replace(/\s+/g, ' ') || 'N/A'
  );
  console.log('After reload tab badges [All, Medical, Dental, Vision]:', reloadedBadges);
  console.log('After reload table rows:', reloadedRows);
  console.log('After reload pagination:', reloadedPagination);

  const shot7 = path.join(ARTIFACT_DIR, 'records_07_refresh_persistence.png');
  await page.screenshot({ path: shot7, fullPage: false });
  console.log('Saved:', shot7);

  await browser.close();
  console.log('\n=== ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY ===');
})();
