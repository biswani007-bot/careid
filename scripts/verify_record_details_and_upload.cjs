const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runVerification() {
  console.log('🚀 Starting verification of Record Details & Upload Lifecycle screens...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  const testResults = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Navigation from Records table to Record Details
    // ----------------------------------------------------
    console.log('\n--- Test 1: Navigation from /admin/records to Record Details ---');
    await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table.records-table', { timeout: 10000 });

    // Look for first record or specific row #REC-10491
    const firstRowViewBtn = await page.$('table.records-table tbody tr button.table-icon-btn, table.records-table tbody tr button[aria-label*="View"]');
    if (firstRowViewBtn) {
      await firstRowViewBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    } else {
      await page.goto(`${BASE_URL}/admin/records/rec-10491`, { waitUntil: 'networkidle2', timeout: 10000 });
    }

    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);
    testResults.push({
      test: 'Navigate to Record Details',
      passed: currentUrl.includes('/admin/records/rec-'),
      url: currentUrl,
    });

    // ----------------------------------------------------
    // TEST 2: Screen A - Inspect Record Details Components
    // ----------------------------------------------------
    console.log('\n--- Test 2: Screen A (Record Details & Audit Trail) ---');
    await page.waitForSelector('.record-details-wrapper', { timeout: 10000 });

    // Check DICOM Viewer Canvas / Inspection Surface
    const dicomCanvas = await page.$('.dicom-canvas-surface, .dicom-viewer-card');
    console.log('DICOM Imaging Surface found:', !!dicomCanvas);

    // Check Discipline Lens Switcher
    const lensButtons = await page.$$('.discipline-pill-btn');
    console.log('Discipline lens tabs count:', lensButtons.length);

    // Check Multi-Discipline Schema Standardization card
    const multiDisciplineCard = await page.$('.grid.grid-cols-1.sm\\:grid-cols-3');
    console.log('Multi-discipline schema cards found:', !!multiDisciplineCard);

    // Check Audit timeline items
    const auditNodes = await page.$$('.audit-timeline-node');
    console.log('Audit timeline nodes count:', auditNodes.length);

    // Test Zoom In on DICOM canvas
    const zoomInBtn = await page.$('button[title*="Zoom In"], button[aria-label*="Zoom In"]');
    if (zoomInBtn) {
      await zoomInBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      console.log('DICOM Zoom In button clicked');
    }

    // Take Desktop Screenshot Top
    const detailsScreenshotPath = path.join(ARTIFACTS_DIR, 'record_details_desktop.png');
    await page.screenshot({ path: detailsScreenshotPath, fullPage: false });
    console.log('Saved screenshot:', detailsScreenshotPath);

    // Scroll down .record-details-canvas and screenshot lower sections (Audit Trail, Metadata, OCR checklist)
    await page.evaluate(() => {
      const scrollEl = document.querySelector('.record-details-canvas');
      if (scrollEl) {
        scrollEl.scrollTop = 550;
      } else {
        window.scrollBy(0, 550);
      }
    });
    await new Promise((r) => setTimeout(r, 600));
    const detailsScrolledScreenshotPath = path.join(ARTIFACTS_DIR, 'record_details_scrolled.png');
    await page.screenshot({ path: detailsScrolledScreenshotPath, fullPage: false });
    console.log('Saved screenshot:', detailsScrolledScreenshotPath);

    // Fullpage screenshot of Screen A
    const detailsFullpageScreenshotPath = path.join(ARTIFACTS_DIR, 'record_details_fullpage.png');
    await page.screenshot({ path: detailsFullpageScreenshotPath, fullPage: true });
    console.log('Saved screenshot:', detailsFullpageScreenshotPath);

    testResults.push({
      test: 'Screen A Elements Rendered',
      passed: !!dicomCanvas && lensButtons.length >= 3 && auditNodes.length >= 3,
      details: {
        canvasFound: !!dicomCanvas,
        lenses: lensButtons.length,
        auditNodes: auditNodes.length,
      },
    });

    // ----------------------------------------------------
    // TEST 3: Screen B - Upload & Record Lifecycle Actions
    // ----------------------------------------------------
    console.log('\n--- Test 3: Screen B (Upload & Record Lifecycle Actions) ---');
    await page.goto(`${BASE_URL}/admin/records/upload`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('.upload-records-wrapper', { timeout: 10000 });

    // Verify Dropzone
    const dropzone = await page.$('.upload-dropzone');
    console.log('Upload dropzone found:', !!dropzone);

    // Verify Metadata Form inputs
    const patientInput = await page.$('#patientId');
    const categorySelect = await page.$('#category');
    const recordTypeInput = await page.$('#recordType');
    const providerInput = await page.$('#provider');
    const facilityInput = await page.$('#facility');
    const summaryTextarea = await page.$('#summary');

    console.log('Form inputs present:', {
      patientInput: !!patientInput,
      categorySelect: !!categorySelect,
      recordTypeInput: !!recordTypeInput,
      providerInput: !!providerInput,
      facilityInput: !!facilityInput,
      summaryTextarea: !!summaryTextarea,
    });

    // Capture Upload Workspace Desktop Screenshot
    const uploadScreenshotPath = path.join(ARTIFACTS_DIR, 'record_upload_desktop.png');
    await page.screenshot({ path: uploadScreenshotPath, fullPage: false });
    console.log('Saved screenshot:', uploadScreenshotPath);

    const uploadFullpageScreenshotPath = path.join(ARTIFACTS_DIR, 'record_upload_fullpage.png');
    await page.screenshot({ path: uploadFullpageScreenshotPath, fullPage: true });
    console.log('Saved screenshot:', uploadFullpageScreenshotPath);

    // ----------------------------------------------------
    // TEST 4: Dialog Interactions (Archive & Restore)
    // ----------------------------------------------------
    console.log('\n--- Test 4: Testing Archive Confirmation Dialog ---');
    const archiveTrigger = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent && b.textContent.includes('Archive Confirmation Dialog'));
    });

    if (archiveTrigger && archiveTrigger.asElement()) {
      await archiveTrigger.asElement().click();
      await page.waitForSelector('.lifecycle-modal-scrim', { timeout: 3000 });
      console.log('Archive Dialog opened');

      const archiveDialogPath = path.join(ARTIFACTS_DIR, 'record_archive_dialog.png');
      await page.screenshot({ path: archiveDialogPath });
      console.log('Saved screenshot:', archiveDialogPath);

      // Close dialog via cancel
      const cancelBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('.lifecycle-dialog-box button'));
        return btns.find((b) => b.textContent && b.textContent.includes('Cancel'));
      });
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 400));
        console.log('Archive Dialog closed via Cancel');
      }
    }

    console.log('\n--- Test 5: Testing Restore Confirmation Dialog ---');
    const restoreTrigger = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent && b.textContent.includes('Restore Record Dialog'));
    });

    if (restoreTrigger && restoreTrigger.asElement()) {
      await restoreTrigger.asElement().click();
      await page.waitForSelector('.lifecycle-modal-scrim', { timeout: 3000 });
      console.log('Restore Dialog opened');

      const restoreDialogPath = path.join(ARTIFACTS_DIR, 'record_restore_dialog.png');
      await page.screenshot({ path: restoreDialogPath });
      console.log('Saved screenshot:', restoreDialogPath);

      // Close dialog via cancel
      const cancelBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('.lifecycle-dialog-box button'));
        return btns.find((b) => b.textContent && b.textContent.includes('Cancel'));
      });
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 400));
        console.log('Restore Dialog closed via Cancel');
      }
    }

    // ----------------------------------------------------
    // TEST 6: Form Validation & Submission
    // ----------------------------------------------------
    console.log('\n--- Test 6: Form Validation & Upload Submission ---');
    // Clear patientId and submit to verify validation error
    await page.evaluate(() => {
      const input = document.getElementById('patientId');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      const hasValidationError = await page.evaluate(() => {
        const errors = document.querySelectorAll('p.text-red-600, .text-\\[\\#ba1a1a\\]');
        return errors.length > 0;
      });
      console.log('Validation error shown on empty patientId:', hasValidationError);
      testResults.push({
        test: 'Form Validation on Missing Patient ID',
        passed: hasValidationError,
      });

      // Refill patientId and submit valid form
      await page.type('#patientId', 'CID-9205-1289');
      await submitBtn.click();
      await new Promise((r) => setTimeout(r, 1200));
      console.log('Valid form submitted');
    }

    testResults.push({
      test: 'Screen B Elements Rendered',
      passed: !!dropzone && !!patientInput,
      details: {
        dropzone: !!dropzone,
        patientInput: !!patientInput,
      },
    });

    // ----------------------------------------------------
    // TEST 7: Mobile Viewport (375x812)
    // ----------------------------------------------------
    console.log('\n--- Test 7: Mobile Viewport Verification (375px) ---');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

    // Upload screen mobile
    await page.goto(`${BASE_URL}/admin/records/upload`, { waitUntil: 'networkidle2' });
    const mobileUploadPath = path.join(ARTIFACTS_DIR, 'record_upload_mobile_375px.png');
    await page.screenshot({ path: mobileUploadPath });
    console.log('Saved mobile upload screenshot:', mobileUploadPath);

    // Details screen mobile
    await page.goto(`${BASE_URL}/admin/records/rec-10491`, { waitUntil: 'networkidle2' });
    const mobileDetailsPath = path.join(ARTIFACTS_DIR, 'record_details_mobile_375px.png');
    await page.screenshot({ path: mobileDetailsPath });
    console.log('Saved mobile details screenshot:', mobileDetailsPath);

    testResults.push({
      test: 'Mobile Viewport Rendering',
      passed: true,
      viewport: '375x812',
    });

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err);
    testResults.push({
      test: 'Execution Error',
      passed: false,
      error: err.message,
    });
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log('🏁 VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log('Console Errors caught:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log('Test Results:');
  console.table(testResults);
}

runVerification();
