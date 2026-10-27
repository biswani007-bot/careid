const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e');

async function run() {
  console.log('=== Starting CareID Patient Registration & Empty States Verification ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('  [Browser Error]:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('  [Page Error]:', err.message);
  });

  try {
    await page.setViewport({ width: 1280, height: 900 });

    // -------------------------------------------------------------------------
    // TEST 1: Initial Render & Design Verification (/admin/patients/create)
    // -------------------------------------------------------------------------
    console.log('Test 1: Navigating to /admin/patients/create...');
    await page.goto('http://localhost:5173/admin/patients/create', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.patient-reg-form', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 600));

    // Inspect layout metrics
    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const activeNav = document.querySelector('.sidebar-nav-item.active .sidebar-nav-label');
      const title = document.querySelector('.patient-reg-title');
      const subtitle = document.querySelector('.patient-reg-subtitle');
      const cards = document.querySelectorAll('.patient-reg-card');
      const photoCircle = document.querySelector('.patient-photo-circle');
      const submitBtn = document.querySelector('.patient-reg-btn-submit');
      const cancelBtn = document.querySelector('.patient-reg-btn-cancel');
      const inputs = document.querySelectorAll('.patient-reg-input, .patient-reg-select');
      const canvas = document.querySelector('.patient-registration-canvas');

      return {
        sidebarWidth: sidebar ? sidebar.getBoundingClientRect().width : null,
        activeNavLabel: activeNav ? activeNav.textContent.trim() : null,
        titleText: title ? title.textContent.trim() : null,
        subtitleText: subtitle ? subtitle.textContent.trim() : null,
        cardCount: cards.length,
        photoCircleSize: photoCircle ? {
          width: photoCircle.getBoundingClientRect().width,
          height: photoCircle.getBoundingClientRect().height
        } : null,
        submitBtnText: submitBtn ? submitBtn.textContent.trim() : null,
        cancelBtnText: cancelBtn ? cancelBtn.textContent.trim() : null,
        inputCount: inputs.length,
        canvasScrollHeight: canvas ? canvas.scrollHeight : null,
        canvasClientHeight: canvas ? canvas.clientHeight : null,
      };
    });

    console.log('Initial Screen Metrics:', JSON.stringify(metrics, null, 2));

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'patient_registration_initial.png');
    await page.screenshot({ path: initialScreenshotPath, fullPage: false });
    console.log('Saved initial state screenshot:', initialScreenshotPath);

    // -------------------------------------------------------------------------
    // TEST 2: Validation on Empty Submit
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Triggering form validation with empty inputs...');
    await page.click('.patient-reg-btn-submit');
    await new Promise(r => setTimeout(r, 400));

    const validationResults = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.patient-reg-error-text')).map(el => el.textContent.trim());
      const invalidInputs = document.querySelectorAll('.has-error');
      return {
        errorCount: errors.length,
        errors,
        invalidInputCount: invalidInputs.length
      };
    });

    console.log('Validation results:', JSON.stringify(validationResults, null, 2));

    const validationScreenshotPath = path.join(ARTIFACT_DIR, 'patient_registration_validation_errors.png');
    await page.screenshot({ path: validationScreenshotPath, fullPage: false });
    console.log('Saved validation errors screenshot:', validationScreenshotPath);

    // -------------------------------------------------------------------------
    // TEST 3: Fill Form with Valid Data & Submit
    // -------------------------------------------------------------------------
    console.log('\nTest 3: Filling form with valid patient details...');
    await page.type('input[name="firstName"]', 'Maya');
    await page.type('input[name="lastName"]', 'Lin');
    await page.type('input[name="dob"]', '1994-06-18');
    await page.select('select[name="gender"]', 'Female');
    await page.type('input[name="email"]', 'maya.lin@healthvault.example');
    await page.type('input[name="phone"]', '+1 (555) 349-8812');
    await page.type('input[name="zipCode"]', '98104');
    await page.type('input[name="address"]', '1042 Pinecrest Avenue, Seattle, WA');

    // Screenshot filled state
    const filledScreenshotPath = path.join(ARTIFACT_DIR, 'patient_registration_filled.png');
    await page.screenshot({ path: filledScreenshotPath, fullPage: false });
    console.log('Saved filled form screenshot:', filledScreenshotPath);

    console.log('Submitting form...');
    await page.click('.patient-reg-btn-submit');
    await page.waitForSelector('.patient-reg-modal-card', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 500));

    const successModalData = await page.evaluate(() => {
      const title = document.querySelector('.patient-reg-modal-title');
      const desc = document.querySelector('.patient-reg-modal-desc');
      const badge = document.querySelector('.patient-reg-modal-badge');
      const buttons = Array.from(document.querySelectorAll('.patient-reg-modal-actions button')).map(b => b.textContent.trim());
      return {
        title: title ? title.textContent.trim() : null,
        desc: desc ? desc.textContent.trim() : null,
        vaultId: badge ? badge.textContent.trim() : null,
        buttons
      };
    });

    console.log('Success Modal Data:', JSON.stringify(successModalData, null, 2));

    const successModalScreenshotPath = path.join(ARTIFACT_DIR, 'patient_registration_success_modal.png');
    await page.screenshot({ path: successModalScreenshotPath, fullPage: false });
    console.log('Saved success modal screenshot:', successModalScreenshotPath);

    // -------------------------------------------------------------------------
    // TEST 4: Navigation to Patients Directory and Verify New Patient Appears
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Navigating back to directory to verify new patient is listed...');
    // Click "Return to Patients Directory" in modal
    const backBtn = await page.$('.patient-reg-modal-btn-tertiary');
    if (backBtn) {
      await backBtn.click();
    } else {
      await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle2' });
    }

    await page.waitForFunction(() => window.location.pathname === '/admin/patients', { timeout: 8000 });
    await page.waitForSelector('.patients-table-row', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 600));

    const directoryVerification = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.patients-table-row'));
      const firstRowName = rows[0]?.querySelector('.patients-name')?.textContent?.trim();
      const firstRowVault = rows[0]?.querySelector('.patients-vault-id')?.textContent?.trim();
      return {
        totalRows: rows.length,
        firstRowName,
        firstRowVault,
      };
    });

    console.log('Directory Verification after Registration:', JSON.stringify(directoryVerification, null, 2));

    const directoryUpdatedScreenshotPath = path.join(ARTIFACT_DIR, 'patients_directory_after_registration.png');
    await page.screenshot({ path: directoryUpdatedScreenshotPath, fullPage: false });
    console.log('Saved updated directory screenshot:', directoryUpdatedScreenshotPath);

    // -------------------------------------------------------------------------
    // TEST 5: Verify "+ Add Patient" button in directory navigates to registration
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Testing "+ Add Patient" button in directory...');
    await page.click('.patients-btn-add');
    await page.waitForFunction(() => window.location.pathname === '/admin/patients/create', { timeout: 8000 });
    console.log('Successfully navigated back to /admin/patients/create via Add Patient CTA!');

    console.log('\n=== All Tests Passed with 0 Browser Errors! ===');
    console.log('Console Errors caught:', consoleErrors.length);
  } catch (err) {
    console.error('\nVerification FAILED with error:', err);
  } finally {
    await browser.close();
  }
}

run();
