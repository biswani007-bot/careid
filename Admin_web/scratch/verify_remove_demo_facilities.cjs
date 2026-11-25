const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

const DEMO_NAMES = [
  'Mount Sinai',
  'Mercy General',
  "Valley Children's",
  'Memorial Sloan',
  'Northwestern Health'
];

async function main() {
  console.log('--- STARTING REMOVE LOCAL DEMO FACILITIES VERIFICATION ---');

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
  console.log('\n[TEST 1] Checking Facility Directory (/admin/facilities)...');
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.facilities-table tbody tr', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1200));

  const dirData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr:not(.facility-skeleton-row)'));
    const names = rows.map(r => r.querySelector('.facilities-primary-name')?.textContent?.trim() || '');
    const ids = rows.map(r => r.querySelector('.facilities-id-badge')?.textContent?.trim() || '');
    const paginationText = document.querySelector('.facilities-pagination-text')?.textContent?.trim();
    const kpiValues = Array.from(document.querySelectorAll('.facilities-kpi-value')).map(el => el.textContent?.trim());
    const storageItem = localStorage.getItem('careid_admin_facilities_records');

    return {
      rowCount: rows.length,
      names,
      ids,
      paginationText,
      kpiValues,
      storageItem,
    };
  });

  console.log('Facility Directory data:', dirData);

  if (dirData.rowCount !== 1) {
    throw new Error(`Expected exactly 1 live facility row, but found ${dirData.rowCount}!`);
  }
  if (!dirData.names[0].includes('Metro General Hospital')) {
    throw new Error(`Expected "Metro General Hospital", got "${dirData.names[0]}"`);
  }
  if (dirData.ids[0] !== 'FAC-METRO-001') {
    throw new Error(`Expected ID "FAC-METRO-001", got "${dirData.ids[0]}"`);
  }
  for (const demo of DEMO_NAMES) {
    if (dirData.names.some(n => n.includes(demo))) {
      throw new Error(`Found demo facility "${demo}" in directory table!`);
    }
  }
  console.log('✓ Facility Directory displays exactly 1 live facility (Metro General Hospital). Zero demo facilities found.');
  console.log('✓ KPIs:', dirData.kpiValues, 'Pagination:', dirData.paginationText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_facility_directory_only_live.png') });

  // 2. Test Page Refresh Persistence
  console.log('\n[TEST 2] Testing Page Refresh (confirm demo facilities do not reappear)...');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.facilities-table tbody tr', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const refreshedData = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr:not(.facility-skeleton-row)'));
    const names = rows.map(r => r.querySelector('.facilities-primary-name')?.textContent?.trim() || '');
    return { rowCount: rows.length, names };
  });

  console.log('Refreshed data:', refreshedData);
  if (refreshedData.rowCount !== 1 || !refreshedData.names[0].includes('Metro General Hospital')) {
    throw new Error('Demo facilities reappeared after page refresh!');
  }
  console.log('✓ Confirmed: After page refresh, only the 1 live facility remains.');

  // 3. Test Add Doctor Hospital Dropdown
  console.log('\n[TEST 3] Checking Add Doctor page (/admin/doctors/add)...');
  await page.goto('http://localhost:5173/admin/doctors/add', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#hospital', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const addDocDropdown = await page.evaluate(() => {
    const select = document.querySelector('#hospital');
    if (!select) return null;
    const options = Array.from(select.querySelectorAll('option'));
    return options.map(opt => ({
      value: opt.value,
      label: opt.textContent.trim(),
      disabled: opt.disabled,
    }));
  });

  console.log('Add Doctor Hospital options:', addDocDropdown);
  const selectableHospitals = addDocDropdown.filter(o => o.value !== '');
  if (selectableHospitals.length !== 1) {
    throw new Error(`Expected exactly 1 hospital option, found ${selectableHospitals.length}`);
  }
  if (!selectableHospitals[0].label.includes('Metro General Hospital')) {
    throw new Error(`Expected "Metro General Hospital", got "${selectableHospitals[0].label}"`);
  }
  if (selectableHospitals[0].value !== '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb') {
    throw new Error(`Expected UUID "3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb", got "${selectableHospitals[0].value}"`);
  }
  for (const demo of DEMO_NAMES) {
    if (addDocDropdown.some(o => o.label.includes(demo))) {
      throw new Error(`Found demo facility "${demo}" in Add Doctor dropdown!`);
    }
  }
  console.log('✓ Confirmed: Add Doctor dropdown contains the exact same live facility (Metro General Hospital).');

  // 4. Test Search Filter on Directory
  console.log('\n[TEST 4] Testing Search and Filter on live directory...');
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.facilities-search-input', { timeout: 10000 });

  // Type non-existent query
  await page.type('.facilities-search-input', 'NonExistentFacilityQuery');
  await new Promise(r => setTimeout(r, 600));

  const emptySearchData = await page.evaluate(() => {
    const emptyState = document.querySelector('.facilities-empty-state');
    const rows = Array.from(document.querySelectorAll('.facilities-table tbody tr'));
    return {
      hasEmptyState: Boolean(emptyState),
      emptyText: emptyState?.textContent?.trim(),
      rowCount: rows.length,
    };
  });
  console.log('Empty Search State:', emptySearchData);
  if (!emptySearchData.hasEmptyState || !emptySearchData.emptyText.includes('No facilities found')) {
    throw new Error('Empty state not rendered properly when 0 facilities match filter');
  }
  console.log('✓ Empty state verified successfully when filter yields 0 records.');

  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('.facilities-search-input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('\nALL REMOVE LOCAL DEMO FACILITIES TESTS PASSED SUCCESSFULLY!');
  await browser.close();
}

main().catch(err => {
  console.error('\nVERIFICATION TEST FAILED:', err);
  process.exit(1);
});

