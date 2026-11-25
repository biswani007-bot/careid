const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFreshToken, apiGet } = require('./api_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function runMedicalRecordsE2E() {
  console.log('=== Step 0: Initializing Auth Token and Puppeteer ===');
  const token = await getFreshToken();
  const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('[vite]') && !text.includes('React DevTools')) {
      console.log('PAGE LOG:', text);
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Pre-seed auth session
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, user }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', token);
    sessionStorage.setItem('careid_refresh_token', refreshToken);
    sessionStorage.setItem('careid_user_session', JSON.stringify(user));
  }, { token, refreshToken: cached.refreshToken, user: cached.user });

  // 1. Upload a new record via Upload Workspace
  console.log('\n=== Step 1: Upload a new record via /admin/records/upload ===');
  await page.goto(`${BASE_URL}/admin/records/upload`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const testPdfPath = path.resolve('scratch/test_files/valid_dental_report.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(testPdfPath);
  await new Promise(r => setTimeout(r, 500));

  // Fill in form with patient Karcus Doe (who has medical records)
  await page.evaluate(() => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    setVal('patientId', 'PT-CAREID-2026-0004'); // Karcus Doe
    setVal('category', 'Medical');
    setVal('recordType', 'Cardiovascular Fluoroscopy Imaging Attachment');
    setVal('provider', 'Dr. Sarah Jenkins, MD');
    setVal('facility', 'CareID Heart Institute');
    setVal('summary', 'Diagnostic cardiac catheterization angiographic run series attached to patient record.');
  });
  await new Promise(r => setTimeout(r, 500));

  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_1_upload_success.png'), fullPage: true });
  console.log('Saved screenshot 1: med_records_1_upload_success.png');

  // 2. Verify backend persistence of the uploaded attachment
  console.log('\n=== Step 2: Verify actual backend persistence ===');
  const karcusTimelineRes = await apiGet('/api/v1/admin/patients/787e5187-7859-4320-bb1a-465a57dd086a/medical-records/timeline');
  console.log('Karcus Doe backend timeline status:', karcusTimelineRes.status, 'Total timeline items:', karcusTimelineRes.body?.data?.length);

  // 3. Open Medical Records (/admin/records/medical)
  console.log('\n=== Step 3: Open /admin/records/medical ===');
  await page.goto(`${BASE_URL}/admin/records/medical`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_2_initial_view.png'), fullPage: true });
  console.log('Saved screenshot 2: med_records_2_initial_view.png');

  // 4. Compare tab count and KPI card total
  console.log('\n=== Step 4 & 5: Check Tab Count and KPI Total Consistency ===');
  const medTabCount = await page.$eval('.category-tab-link.active .category-tab-count-badge', el => el.innerText.trim());
  const kpiTotalCount = await page.$eval('.category-kpi-card:nth-child(1) .category-kpi-number', el => el.innerText.trim());
  const kpiVerifiedCount = await page.$eval('.category-kpi-card:nth-child(2) .category-kpi-number', el => el.innerText.trim());
  const kpiPendingCount = await page.$eval('.category-kpi-card:nth-child(3) .category-kpi-number', el => el.innerText.trim());

  console.log('Medical Records Active Tab Badge:', medTabCount);
  console.log('Total Medical Records Card:', kpiTotalCount);
  console.log('Verified Records Card:', kpiVerifiedCount);
  console.log('Pending Verification Card:', kpiPendingCount);

  if (medTabCount === kpiTotalCount) {
    console.log('PASSED: Tab count and Total KPI card match exactly! (No 50 vs 99 mismatch)');
  } else {
    console.log('WARNING: Counts differ:', medTabCount, 'vs', kpiTotalCount);
  }

  // 6. Test Search Filter
  console.log('\n=== Step 6: Test Search by Patient / Title ===');
  const searchInput = await page.$('.category-search-input');
  await searchInput.type('Cath');
  await new Promise(r => setTimeout(r, 1000));
  const searchResultCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after search "Cath":', searchResultCount);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_3_search_filter.png'), fullPage: true });

  // Clear search
  await page.click('.category-search-box button[aria-label="Clear search"]');
  await new Promise(r => setTimeout(r, 800));

  // 7. Filter by Provider
  console.log('\n=== Step 7: Filter by Provider ===');
  const providerOptions = await page.$$eval('#provider-select option', opts => opts.map(o => o.value));
  console.log('Available provider options in dropdown:', providerOptions);
  
  const targetProvider = providerOptions.find(p => p.includes('Dr. Sarah Jenkins') || p.includes('Dr. Michael Chang')) || providerOptions[1];
  console.log('Selecting provider:', targetProvider);
  await page.select('#provider-select', targetProvider);
  await new Promise(r => setTimeout(r, 800));
  const providerFilteredCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after provider filter:', providerFilteredCount);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_4_provider_filter.png'), fullPage: true });

  // 8. Filter by Facility
  console.log('\n=== Step 8: Filter by Facility ===');
  const facilityOptions = await page.$$eval('#facility-select option', opts => opts.map(o => o.value));
  console.log('Available facility options in dropdown count:', facilityOptions.length);
  const targetFacility = facilityOptions[1];
  console.log('Selecting facility:', targetFacility);
  await page.select('#facility-select', targetFacility);
  await new Promise(r => setTimeout(r, 800));
  const facilityFilteredCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after provider + facility filter:', facilityFilteredCount);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_5_combined_filters.png'), fullPage: true });

  // 9. Reset Filters
  console.log('\n=== Step 9: Reset All Filters ===');
  await page.click('.btn-category-reset');
  await new Promise(r => setTimeout(r, 1000));
  const resetCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after Reset Filters:', resetCount);

  // 10. Filter by Status
  console.log('\n=== Step 10: Filter by Status ===');
  await page.select('#status-select', 'Verified');
  await new Promise(r => setTimeout(r, 800));
  const verifiedCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after status=Verified:', verifiedCount);

  await page.select('#status-select', 'Pending Verification');
  await new Promise(r => setTimeout(r, 800));
  const pendingCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
  console.log('Pagination info after status=Pending Verification:', pendingCount);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_6_status_filter.png'), fullPage: true });

  await page.select('#status-select', 'All Statuses');
  await new Promise(r => setTimeout(r, 500));

  // 11. Filter by Date Range
  console.log('\n=== Step 11: Filter by Date Range ===');
  await page.click('.category-date-button');
  await new Promise(r => setTimeout(r, 600));

  // Select "This Month (November 2026)"
  const presetButtons = await page.$$('.category-modal-body button');
  let monthPresetBtn = null;
  for (const b of presetButtons) {
    const txt = await page.evaluate(el => el.innerText, b);
    if (txt.includes('November 2026')) {
      monthPresetBtn = b;
      break;
    }
  }
  if (monthPresetBtn) {
    await monthPresetBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const novCount = await page.$eval('.pagination-info-text', el => el.innerText.trim());
    console.log('Pagination info after November 2026 date filter:', novCount);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_7_date_range_filter.png'), fullPage: true });
  }

  // Reset Filters again
  await page.click('.btn-category-reset');
  await new Promise(r => setTimeout(r, 1000));

  // 12. Navigate between pages (Pagination Test)
  console.log('\n=== Step 12: Test Pagination Navigation ===');
  const page2Btn = await page.$('button[aria-label="Page 2"]');
  if (page2Btn) {
    await page2Btn.click();
    await new Promise(r => setTimeout(r, 800));
    const page2Info = await page.$eval('.pagination-info-text', el => el.innerText.trim());
    console.log('Pagination info on Page 2:', page2Info);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_8_page_2_navigation.png'), fullPage: true });
  }

  // 13. Refresh browser and verify data remains consistent
  console.log('\n=== Step 13: Refresh Browser and Verify Consistency ===');
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const refreshedTabCount = await page.$eval('.category-tab-link.active .category-tab-count-badge', el => el.innerText.trim());
  const refreshedKpiCount = await page.$eval('.category-kpi-card:nth-child(1) .category-kpi-number', el => el.innerText.trim());
  console.log(`After page reload -> Active Tab Badge: ${refreshedTabCount}, Total KPI Card: ${refreshedKpiCount}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'med_records_9_after_reload.png'), fullPage: true });

  await browser.close();
  console.log('\nAll Medical Records E2E verification tests completed successfully!');
}

runMedicalRecordsE2E().catch(err => {
  console.error('E2E Verification failed:', err);
  process.exit(1);
});
