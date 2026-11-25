const puppeteer = require('puppeteer');
const path = require('path');
const { getFreshToken, apiGet } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('=== CAREID ADMIN — DOCTOR TO FACILITY MAPPING E2E VERIFICATION ===\n');

  const token = await getFreshToken();

  // Get first doctor from backend for test
  const docsRes = await apiGet('/api/v1/doctors?limit=5');
  const testDoctor = docsRes.body.data?.[0];
  if (!testDoctor) {
    throw new Error('No test doctor found in live backend');
  }
  console.log(`Using live test doctor: ${testDoctor.fullName} (ID: ${testDoctor.id})\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });

    // 1. Authenticate session
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
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

    // 2. Open Doctor Directory
    console.log('1. Navigating to Doctor Directory (/admin/doctors)...');
    await page.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.doctors-action-btn', { timeout: 10000 });
    console.log('✓ Doctor Directory loaded with action buttons.');

    // 3. Click three-dot action menu on the doctor row
    console.log('2. Clicking action menu on doctor row...');
    const actionBtn = await page.$('.doctors-action-btn');
    if (!actionBtn) throw new Error('Action button not found');
    await actionBtn.click();
    await page.waitForSelector('.doctors-row-menu', { timeout: 5000 });

    // 4. Click "Map to Facility"
    console.log('3. Clicking "Map to Facility"...');
    const menuItems = await page.$$('.doctors-row-menu-item');
    let mapToFacBtn = null;
    for (const item of menuItems) {
      const text = await page.evaluate(el => el.innerText, item);
      if (text.includes('Map to Facility')) {
        mapToFacBtn = item;
        break;
      }
    }
    if (!mapToFacBtn) throw new Error('"Map to Facility" menu item not found');
    await mapToFacBtn.click();

    // 5. Verify navigation to /admin/doctors/:doctorId/map-facility
    await new Promise(r => setTimeout(r, 1500));

    const currentUrl = page.url();
    console.log(`Navigated to: ${currentUrl}`);
    if (!currentUrl.includes('/map-facility')) {
      throw new Error(`Expected URL to contain /map-facility, got: ${currentUrl}`);
    }

    // 6. Verify NO "Facility Not Found" or "fac-1" error
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Facility Not Found') || pageText.includes('fac-1')) {
      throw new Error(`Regression detected: page contains "Facility Not Found" or "fac-1": ${pageText.slice(0, 300)}`);
    }
    console.log('✓ Confirmed: No "Facility Not Found" or "fac-1" error!');

    // 7. Verify Doctor-to-Facility Mapping interface elements
    await page.waitForSelector('.mapdoc-hero-title', { timeout: 8000 });
    const heroTitle = await page.evaluate(() => document.querySelector('.mapdoc-hero-title')?.innerText);
    console.log(`Hero Title: "${heroTitle}"`);

    // Screenshot 1: Initial Doctor-to-Facility screen
    const shot1 = path.join(ARTIFACTS_DIR, 'doctor_map_facility_screen_initial.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved screenshot: ${shot1}`);

    // 8. Verify live facilities are listed in the table
    await page.waitForSelector('.mapdoc-row', { timeout: 8000 });
    const facilitiesList = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.mapdoc-row'));
      return rows.map(r => {
        const name = r.querySelector('.mapdoc-doc-name')?.innerText?.trim();
        const code = r.querySelector('.mapdoc-doc-identifiers')?.innerText?.trim();
        const status = r.querySelector('.mapdoc-status-badge')?.innerText?.trim();
        return { name, code, status };
      });
    });
    console.log('\n4. Loaded Live Facilities in Directory:');
    console.table(facilitiesList);

    // 9. Test search filter
    console.log('\n5. Testing facility search input ("Apex")...');
    const searchInput = '#search-facilities-input';
    await page.type(searchInput, 'Apex', { delay: 50 });
    await new Promise(r => setTimeout(r, 800));

    const filteredRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.mapdoc-row')).map(r =>
        r.querySelector('.mapdoc-doc-name')?.innerText?.trim()
      );
    });
    console.log('Filtered facility results for "Apex":', filteredRows);

    // Screenshot 2: Search and filter view
    const shot2 = path.join(ARTIFACTS_DIR, 'doctor_map_facility_search_filter.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved screenshot: ${shot2}`);

    // Clear search
    await page.click(searchInput, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 600));

    // 10. Select a facility
    console.log('\n6. Selecting a facility to map...');
    const facilityRow = await page.$('.mapdoc-row');
    await facilityRow.click();
    await new Promise(r => setTimeout(r, 800));

    // Verify right drawer identity details
    const selectedDetails = await page.evaluate(() => {
      const name = document.querySelector('.mapdoc-identity-name')?.innerText?.trim();
      const meta = document.querySelector('.mapdoc-identity-meta')?.innerText?.trim();
      return { name, meta };
    });
    console.log('Selected Target Facility in Drawer:', selectedDetails);

    // Screenshot 3: Configured Drawer
    const shot3 = path.join(ARTIFACTS_DIR, 'doctor_map_facility_configured.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved screenshot: ${shot3}`);

    // 11. Submit the mapping form
    console.log('\n7. Submitting Doctor-to-Facility Mapping...');
    const submitBtn = '#btn-confirm-map-doctor';
    await page.waitForSelector(submitBtn);
    await page.click(submitBtn);

    // 12. Wait for toast notification
    await page.waitForSelector('[role="status"]', { timeout: 10000 });
    const toastText = await page.evaluate(() => document.querySelector('[role="status"]')?.innerText?.trim());
    console.log(`✓ Toast feedback: "${toastText}"`);

    // Screenshot 4: Success Toast
    const shot4 = path.join(ARTIFACTS_DIR, 'doctor_map_facility_success_toast.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved screenshot: ${shot4}`);

    // 13. Reload page to verify persistence
    console.log('\n8. Reloading page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.mapdoc-row', { timeout: 8000 });
    await page.waitForSelector('.mapdoc-status-badge.mapped', { timeout: 12000 });

    const persistedFacilities = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.mapdoc-row')).map(r => ({
        name: r.querySelector('.mapdoc-doc-name')?.innerText?.trim(),
        status: r.querySelector('.mapdoc-status-badge')?.innerText?.trim(),
      }));
    });
    console.log('Facilities status after reload:');
    console.table(persistedFacilities);

    // Screenshot 5: Persisted after reload
    const shot5 = path.join(ARTIFACTS_DIR, 'doctor_map_facility_persisted_reload.png');
    await page.screenshot({ path: shot5, fullPage: false });
    console.log(`Saved screenshot: ${shot5}`);

    console.log('\n=== ALL E2E VERIFICATIONS PASSED SUCCESSFULLY! ===\n');
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
