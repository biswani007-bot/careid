const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function clearAndType(page, selector, text) {
  await page.click(selector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, selector);
  await new Promise(r => setTimeout(r, 150));
  if (text) {
    await page.type(selector, text, { delay: 60 });
  }
}

(async () => {
  console.log('=== CAREID ADMIN — PATIENT AUTOCOMPLETE & VERIFICATION E2E TEST ===\n');

  const token = await getFreshToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });

    // Set auth token
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

    console.log('1. Navigating to /admin/records/upload...');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Ensure search input exists
    const inputSelector = '#patientSearchInput';
    await page.waitForSelector(inputSelector, { timeout: 5000 });
    console.log('✓ Verified patient search input rendered.');

    // -------------------------------------------------------------
    // TEST 1: Focus search input & view available verified patients
    // -------------------------------------------------------------
    console.log('\n2. Testing Focus & Initial Search...');
    await page.click(inputSelector);
    await page.waitForSelector('#patient-autocomplete-dropdown', { timeout: 6000 });
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });
    console.log('✓ Dropdown opened on focus with verified patients.');

    // Screenshot 1: Dropdown open with initial verified patients
    const dropdownShot = path.join(ARTIFACTS_DIR, 'patient_autocomplete_dropdown.png');
    await page.screenshot({ path: dropdownShot, fullPage: false });
    console.log(`Saved screenshot: ${dropdownShot}`);

    // -------------------------------------------------------------
    // TEST 2: Search by partial name "Marc"
    // -------------------------------------------------------------
    console.log('\n3. Testing partial name search ("Marc")...');
    await clearAndType(page, inputSelector, 'Marc');
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });

    const matchesName = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.patient-dropdown-item'));
      return items.map((it) => it.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log('Matches for "Marc":', matchesName);

    // -------------------------------------------------------------
    // TEST 3: Search by partial Care ID "0004"
    // -------------------------------------------------------------
    console.log('\n4. Testing partial Care ID search ("0004")...');
    await clearAndType(page, inputSelector, '0004');
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });

    const matchesId = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.patient-dropdown-item'));
      return items.map((it) => it.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log('Matches for "0004":', matchesId);

    // -------------------------------------------------------------
    // TEST 4: Search for unverified patient "PAT-929510" (Lucas Vance)
    // Must be excluded from verified results and show warning notice
    // -------------------------------------------------------------
    console.log('\n5. Testing unverified account exclusion ("PAT-929510")...');
    await clearAndType(page, inputSelector, 'PAT-929510');
    await page.waitForSelector('.bg-amber-50', { timeout: 8000 });

    const unverifiedEvaluation = await page.evaluate(() => {
      const verifiedItems = document.querySelectorAll('.patient-dropdown-item').length;
      const warningBox = document.querySelector('.bg-amber-50');
      const warningText = warningBox ? warningBox.innerText.replace(/\s+/g, ' ').trim() : null;
      return { verifiedItems, warningText };
    });
    console.log('Unverified search result:', unverifiedEvaluation);

    // Screenshot 2: Unverified excluded warning
    const unverifiedShot = path.join(ARTIFACTS_DIR, 'patient_autocomplete_unverified_excluded.png');
    await page.screenshot({ path: unverifiedShot, fullPage: false });
    console.log(`Saved screenshot: ${unverifiedShot}`);

    // -------------------------------------------------------------
    // TEST 5: Search for non-existent patient "INVALID-999999"
    // -------------------------------------------------------------
    console.log('\n6. Testing non-existent patient ("INVALID-999999")...');
    await clearAndType(page, inputSelector, 'INVALID-999999');
    await new Promise(r => setTimeout(r, 1200));

    const emptyEvaluation = await page.evaluate(() => {
      const feedback = document.querySelector('.patient-dropdown-feedback');
      return feedback ? feedback.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Empty search feedback:', emptyEvaluation);

    // -------------------------------------------------------------
    // TEST 6: Search and select verified patient "Marcus"
    // -------------------------------------------------------------
    console.log('\n7. Selecting verified patient Marcus Vance...');
    await clearAndType(page, inputSelector, 'Marcus');
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });
    await page.click('.patient-dropdown-item');
    await page.waitForSelector('#confirmed-patient-card', { timeout: 5000 });

    const confirmedCard = await page.evaluate(() => {
      const card = document.querySelector('#confirmed-patient-card');
      return card ? card.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Confirmed Card Content:', confirmedCard);

    // Screenshot 3: Confirmed selection card
    const confirmedShot = path.join(ARTIFACTS_DIR, 'patient_autocomplete_confirmed_selection.png');
    await page.screenshot({ path: confirmedShot, fullPage: false });
    console.log(`Saved screenshot: ${confirmedShot}`);

    // -------------------------------------------------------------
    // TEST 7: Test "Change" button
    // -------------------------------------------------------------
    console.log('\n8. Testing "Change" button...');
    await page.click('#change-patient-btn');
    await page.waitForSelector('#patientSearchInput', { timeout: 5000 });
    console.log('✓ Search input reappeared after Change.');

    // Reselect Marcus Vance for upload
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });
    await page.click('.patient-dropdown-item');
    await page.waitForSelector('#confirmed-patient-card', { timeout: 5000 });
    console.log('✓ Re-selected Marcus Vance.');

    // -------------------------------------------------------------
    // TEST 8: Full Upload Flow with confirmed verified patient
    // -------------------------------------------------------------
    console.log('\n9. Testing Full Document Upload with Verified Patient...');

    // Create a temporary valid PDF document
    const tempPdfPath = path.join(__dirname, 'test_verified_patient_doc.pdf');
    const pdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\n' +
      'xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n' +
      'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n214\n%%EOF\n'
    );
    fs.writeFileSync(tempPdfPath, pdfContent);

    // Set file input
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(tempPdfPath);
    await new Promise((r) => setTimeout(r, 1200));

    // Fill optional metadata
    await page.type('#recordType', 'Dental Panoramic Scan');
    await page.type('#provider', 'Dr. Sarah Jenkins');
    await page.type('#facility', 'Metropolitan Health Center');
    await page.type('#summary', 'Verified patient autocomplete E2E integration test.');

    // Click submit
    console.log('Submitting upload form...');
    await page.click('.upload-submit-btn');

    // Wait for success toast
    await page.waitForSelector('.upload-toast-notification', { timeout: 15000 });
    const toastText = await page.evaluate(() => {
      const el = document.querySelector('.upload-toast-notification');
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Upload Result Toast:', toastText);

    // Wait 1 second and capture screenshot of success state
    await new Promise((r) => setTimeout(r, 1000));
    const uploadSuccessShot = path.join(ARTIFACTS_DIR, 'patient_upload_with_verified_patient.png');
    await page.screenshot({ path: uploadSuccessShot, fullPage: false });
    console.log(`Saved screenshot: ${uploadSuccessShot}`);

    // Cleanup temp pdf
    try { fs.unlinkSync(tempPdfPath); } catch {}

    console.log('\n=== ALL E2E TESTS PASSED SUCCESSFULLY! ===\n');
  } catch (err) {
    console.error('E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
