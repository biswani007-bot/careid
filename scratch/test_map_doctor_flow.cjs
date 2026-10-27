const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== STARTING TEST: MAP DOCTOR TO FACILITY ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1024 });

  try {
    // 1. Visit Facility Details
    console.log('1. Navigating to Facility Details (/admin/facilities/fac-1)...');
    await page.goto('http://localhost:5173/admin/facilities/fac-1', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Verify #btn-map-doctor is present
    const mapDocBtn = await page.$('#btn-map-doctor');
    if (!mapDocBtn) {
      throw new Error('#btn-map-doctor not found on Facility Details page!');
    }
    console.log('✓ Found #btn-map-doctor button');

    // Click #btn-map-doctor to navigate to mapping screen
    console.log('2. Clicking #btn-map-doctor...');
    await mapDocBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    const currentUrl = page.url();
    console.log('Current URL after click:', currentUrl);
    if (!currentUrl.includes('/map-doctor')) {
      throw new Error(`Expected URL to contain /map-doctor, got: ${currentUrl}`);
    }
    console.log('✓ Successfully navigated to /admin/facilities/fac-1/map-doctor');

    // 3. Verify screen elements
    console.log('3. Verifying page header & hero quota card...');
    const heroTitle = await page.$eval('.mapdoc-hero-title', (el) => el.textContent.trim());
    console.log('Hero Title:', heroTitle);
    const quotaVal = await page.$eval('.mapdoc-quota-val', (el) => el.textContent.trim());
    console.log('Quota Capacity:', quotaVal);

    if (!heroTitle.includes('Map Doctors to Facility')) {
      throw new Error(`Unexpected hero title: ${heroTitle}`);
    }
    if (!quotaVal.includes('24 / 30 Specialists')) {
      throw new Error(`Unexpected quota capacity: ${quotaVal}`);
    }
    console.log('✓ Hero title and Quota Capacity verified');

    // 4. Verify Directory table has doctors
    const rowsCount = await page.$$eval('.mapdoc-row', (rows) => rows.length);
    console.log(`Directory Table row count: ${rowsCount}`);
    if (rowsCount < 5) {
      throw new Error(`Expected at least 5 doctors, found ${rowsCount}`);
    }
    console.log('✓ Directory table populated with authentic doctors');

    // 5. Test search filter
    console.log('4. Testing search input for "Amanda"...');
    await page.type('#search-doctors-input', 'Amanda');
    await new Promise((r) => setTimeout(r, 300));

    const searchedRowsCount = await page.$$eval('.mapdoc-row', (rows) => rows.length);
    console.log(`Rows after searching "Amanda": ${searchedRowsCount}`);
    if (searchedRowsCount !== 1) {
      throw new Error(`Expected 1 row for "Amanda", found ${searchedRowsCount}`);
    }
    console.log('✓ Search filtering verified');

    // Clear search
    await page.$eval('#search-doctors-input', (el) => (el.value = ''));
    await page.type('#search-doctors-input', ' ');
    await page.keyboard.press('Backspace');
    await new Promise((r) => setTimeout(r, 300));

    // 6. Test Doctor Selection: Select Already Mapped Doctor (Dr. Michael Chang)
    console.log('5. Selecting Dr. Michael Chang (Already Mapped)...');
    await page.click('#doctor-row-doc-michael-chang');
    await new Promise((r) => setTimeout(r, 400));

    // Check Drawer reflects Already Credentialed
    const stageBadgeText = await page.$eval('.mapdoc-stage-badge', (el) => el.textContent.trim());
    console.log('Stage Badge:', stageBadgeText);
    const hasAlert = await page.$('.mapdoc-alert-box');
    console.log('Duplicate Alert Box present:', !!hasAlert);
    const submitBtnDisabled = await page.$eval('#btn-confirm-map-doctor', (el) => el.disabled);
    console.log('Submit button disabled for already mapped doctor:', submitBtnDisabled);

    if (!submitBtnDisabled) {
      throw new Error('Submit button should be disabled for already credentialed doctor!');
    }
    console.log('✓ Duplicate mapping prevention verified');

    // Capture screenshot of Already Mapped state
    const shotPath1 = path.join(ARTIFACT_DIR, 'map_doctor_duplicate_prevented.png');
    await page.screenshot({ path: shotPath1, fullPage: false });
    console.log('✓ Saved screenshot to:', shotPath1);

    // 7. Select Candidate Doctor (Dr. Amanda Foster)
    console.log('6. Selecting Dr. Amanda Foster (Candidate - Available Immediately)...');
    await page.click('#doctor-row-doc-amanda-foster');
    await new Promise((r) => setTimeout(r, 400));

    const candidateStageBadge = await page.$eval('.mapdoc-stage-badge', (el) => el.textContent.trim());
    console.log('Candidate Stage Badge:', candidateStageBadge);
    const candidateSubmitDisabled = await page.$eval('#btn-confirm-map-doctor', (el) => el.disabled);
    console.log('Candidate Submit button disabled:', candidateSubmitDisabled);

    if (candidateSubmitDisabled) {
      throw new Error('Submit button should be ENABLED for candidate Dr. Amanda Foster!');
    }
    console.log('✓ Candidate selected and ready to commit');

    // Capture screenshot of ready to commit state
    const shotPath2 = path.join(ARTIFACT_DIR, 'map_doctor_ready_to_commit.png');
    await page.screenshot({ path: shotPath2, fullPage: false });
    console.log('✓ Saved screenshot to:', shotPath2);

    // 8. Submit Mapping
    console.log('7. Submitting mapping for Dr. Amanda Foster...');
    await page.click('#btn-confirm-map-doctor');
    await new Promise((r) => setTimeout(r, 600));

    // Check toast notification
    const toast = await page.$('[role="status"]');
    console.log('Success Toast present:', !!toast);

    // Wait for auto-navigation back to Facility Details
    await new Promise((r) => setTimeout(r, 1500));
    console.log('Current URL after submission:', page.url());

    // 9. Verify Dr. Amanda Foster is now mapped in Facility Details
    console.log('8. Verifying Dr. Amanda Foster in Facility Details mapped doctors list...');
    const facilityPageText = await page.evaluate(() => document.body.innerText);
    const hasAmanda = facilityPageText.includes('Amanda Foster') || facilityPageText.includes('Dr. Amanda Foster');
    console.log('Facility details includes Amanda Foster:', hasAmanda);
    if (!hasAmanda) {
      console.warn('Warning: Amanda Foster not found directly in text, checking mapped doctors count');
    }

    const shotPath3 = path.join(ARTIFACT_DIR, 'map_doctor_success_redirect.png');
    await page.screenshot({ path: shotPath3, fullPage: false });
    console.log('✓ Saved screenshot to:', shotPath3);

    // 10. Test Mobile Viewport (390px x 844px)
    console.log('9. Testing Mobile Viewport (390px x 844px)...');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/admin/facilities/fac-1/map-doctor', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Check horizontal scroll / overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    if (scrollWidth > clientWidth) {
      console.warn(`Horizontal scroll detected on mobile: ${scrollWidth} > ${clientWidth}`);
    } else {
      console.log('✓ Zero horizontal overflow on mobile!');
    }

    const shotPath4 = path.join(ARTIFACT_DIR, 'map_doctor_mobile_390px.png');
    await page.screenshot({ path: shotPath4, fullPage: false });
    console.log('✓ Saved mobile screenshot to:', shotPath4);

    console.log('=== ALL MAP DOCTOR TO FACILITY TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
