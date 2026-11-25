const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

async function main() {
  console.log('--- STARTING FACILITY DIRECTORY AUTOMATED VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.token;

  // Initialize Auth
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'usr_superadmin',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator',
      email: 'superadmin@careid.test'
    }));
  }, token);

  // 1. Navigate to Facility Directory
  console.log('\n[TEST 1] Navigating to /admin/facilities...');
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => document.querySelectorAll('.facilities-table tbody tr').length > 0 && !document.querySelector('.facility-skeleton-row'),
    { timeout: 10000 }
  );
  await new Promise(r => setTimeout(r, 1000));

  const page1Info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr'));
    const names = rows.map(r => r.querySelector('.facilities-primary-name')?.textContent?.trim());
    const ids = rows.map(r => r.querySelector('.facilities-id-badge')?.textContent?.trim());
    const paginationText = document.querySelector('.facilities-pagination-text')?.textContent?.trim();
    const kpiValues = Array.from(document.querySelectorAll('.facilities-kpi-value')).map(el => el.textContent?.trim());
    const tableWrapper = document.querySelector('.facilities-table-wrapper');
    const tableCard = document.querySelector('.facilities-table-card');

    return {
      rowCount: rows.length,
      names,
      ids,
      paginationText,
      kpiValues,
      hasWrapperVerticalScroll: (tableWrapper?.scrollHeight || 0) > (tableWrapper?.clientHeight || 0),
      tableCardHeight: tableCard?.clientHeight,
    };
  });

  console.log('Test 1 Data (Facility Directory):', page1Info);
  if (page1Info.rowCount === 0) throw new Error('No facilities rendered in directory table');
  if (!page1Info.names.some(n => n?.includes('Metro General Hospital'))) {
    throw new Error('Live Metro General Hospital not found in facilities list');
  }
  if (page1Info.hasWrapperVerticalScroll) {
    throw new Error('Table wrapper should NOT have vertical scrollbar');
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_facilities_directory.png') });

  // 2. Test Search Filter
  console.log('\n[TEST 2] Testing Search query "Metro"...');
  await page.type('.facilities-search-input', 'Metro');
  await new Promise(r => setTimeout(r, 500));

  const searchResult = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr'));
    const names = rows.map(r => r.querySelector('.facilities-primary-name')?.textContent?.trim());
    const paginationText = document.querySelector('.facilities-pagination-text')?.textContent?.trim();
    return { rowCount: rows.length, names, paginationText };
  });

  console.log('Search Result:', searchResult);
  if (!searchResult.names.every(n => n?.toLowerCase().includes('metro'))) {
    throw new Error('Search filter did not isolate Metro General Hospital');
  }

  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('.facilities-search-input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Test Export CSV
  console.log('\n[TEST 3] Testing Export CSV button...');
  await page.evaluate(() => {
    const exportBtn = document.querySelector('.facilities-export-btn');
    if (exportBtn) exportBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const snackbarText = await page.evaluate(() => {
    return document.querySelector('.action-success-snackbar, .careid-snackbar, [role="status"]')?.textContent?.trim();
  });
  console.log('Export Snackbar Toast:', snackbarText);

  // 4. Navigate to Metro General Hospital Details
  console.log('\n[TEST 4] Navigating to Metro General Hospital details...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr'));
    const metroRow = rows.find(r => r.textContent?.includes('Metro General Hospital'));
    if (metroRow) {
      const link = metroRow.querySelector('.facilities-primary-name');
      if (link) link.click();
    }
  });
  await page.waitForSelector('.facility-master-title', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Current URL:', page.url());

  const detailInfo = await page.evaluate(() => {
    const title = document.querySelector('.facility-master-title')?.textContent?.trim();
    const facId = document.querySelector('.facility-master-facid')?.textContent?.trim();
    const phone = document.querySelector('.facility-nexus-field-val')?.textContent?.trim();
    return { title, facId, phone };
  });
  console.log('Detail Info:', detailInfo);
  if (!detailInfo.title?.includes('Metro General Hospital')) {
    throw new Error(`Expected Metro General Hospital, got ${detailInfo.title}`);
  }

  // 5. Test Mapped Doctors Tab
  console.log('\n[TEST 5] Checking Mapped Doctors Tab...');
  await page.evaluate(() => {
    const docTab = Array.from(document.querySelectorAll('.facility-tab-btn')).find(b => b.textContent?.includes('Mapped Doctors'));
    if (docTab) docTab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const doctorsInFac = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facility-doc-name'));
    return rows.map(r => r.textContent?.trim());
  });
  console.log('Mapped Doctors:', doctorsInFac);
  if (doctorsInFac.length === 0) {
    throw new Error('No mapped doctors found for Metro General Hospital');
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_facility_mapped_doctors.png') });

  // 6. Test Map Doctor Navigation
  console.log('\n[TEST 6] Testing Map Doctor Page...');
  await page.evaluate(() => {
    const btn = document.querySelector('#btn-map-doctor');
    if (btn) btn.click();
  });
  await page.waitForFunction(() => window.location.pathname.includes('/map-doctor'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));
  console.log('Map Doctor Page URL:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_map_doctor_screen.png') });

  // Go back to directory
  console.log('\n[TEST 7] Going back to Facility Directory...');
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.facilities-table tbody tr', { timeout: 10000 });
  console.log('Back on directory page successfully.');

  console.log('\nALL FACILITY VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  await browser.close();
}

main().catch(err => {
  console.error('\nFACILITY VERIFICATION FAILED:', err);
  process.exit(1);
});

