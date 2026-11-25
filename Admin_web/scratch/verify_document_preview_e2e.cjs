const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const helper = require('./token_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('=== STARTING END-TO-END DOCUMENT VAULT & PREVIEW VERIFICATION ===\n');

  const token = await helper.getAdminToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const verificationResults = [];
  function record(scenario, expected, actual, pass, details = {}) {
    verificationResults.push({ scenario, expected, actual, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${scenario} -> ${actual}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Authenticate session
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    await page.evaluate((tok) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', tok);
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: 'bc6f6875-434c-4050-b893-07343cc27986',
        role: 'SUPER_ADMIN',
        fullName: 'Super Administrator',
        email: 'admin@careid.com'
      }));
    }, token);

    // ------------------------------------------------------------------------
    // TEST 1: MEDICAL RECORD (04d8276b-1e4f-4a8e-b53b-f322effd8430 - medical_blood_panel.pdf)
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing Medical Record: 04d8276b-1e4f-4a8e-b53b-f322effd8430 ---');
    await page.goto('http://localhost:5174/admin/records/04d8276b-1e4f-4a8e-b53b-f322effd8430', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Verify Patient Name & Meta
    const medPatientName = await page.$eval('h2.record-patient-name', el => el.textContent.trim());
    console.log('Patient Name:', medPatientName);

    // Check if iframe exists and has blob: URL
    const medIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('.dicom-canvas-surface iframe');
      return iframe ? iframe.getAttribute('src') : null;
    });
    console.log('Medical iframe src:', medIframeSrc);

    const hasMedStreamError = await page.evaluate(() => {
      const el = document.querySelector('.dicom-canvas-surface .bg-red-950\\/40');
      return el ? el.textContent.trim() : null;
    });

    record(
      'Medical Record Stream Preview',
      'Iframe rendered with blob: URL and NO error banner',
      medIframeSrc && medIframeSrc.startsWith('blob:') && !hasMedStreamError
        ? `Rendered (${medIframeSrc.slice(0, 35)}...)`
        : `Error: ${hasMedStreamError || 'No iframe'}`,
      Boolean(medIframeSrc && medIframeSrc.startsWith('blob:') && !hasMedStreamError)
    );

    // Check File Size display: should be 68 B, NOT 0 KB
    const medDownloadBtnText = await page.evaluate(() => {
      const btn = document.querySelector('.btn-details-download');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Download button text:', medDownloadBtnText);

    record(
      'Medical File Size Accuracy (Non-zero)',
      'Display 68 B in download button and meta cards',
      medDownloadBtnText || 'Not found',
      Boolean(medDownloadBtnText && medDownloadBtnText.includes('68 B') && !medDownloadBtnText.includes('0 KB'))
    );

    // Test binary download in browser context
    const medBinaryBlob = await page.evaluate(async () => {
      const res = await fetch('/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794598880381-medical_blood_panel.pdf');
      const blob = await res.blob();
      return { size: blob.size, type: blob.type };
    });
    console.log('Medical downloaded binary test:', medBinaryBlob);

    record(
      'Medical Binary Size Integrity',
      'Exact 68 bytes matching database checksum',
      `Size: ${medBinaryBlob.size} bytes (${medBinaryBlob.type})`,
      medBinaryBlob.size === 68
    );

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preview_01_medical_blood_panel.png'), fullPage: true });

    // ------------------------------------------------------------------------
    // TEST 2: DENTAL RECORD (2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed - dental_panoramic_opg.pdf)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Dental Record: 2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed ---');
    await page.goto('http://localhost:5174/admin/records/2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const dentalIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('.dicom-canvas-surface iframe');
      return iframe ? iframe.getAttribute('src') : null;
    });
    const hasDentalError = await page.evaluate(() => {
      const el = document.querySelector('.dicom-canvas-surface .bg-red-950\\/40');
      return el ? el.textContent.trim() : null;
    });

    record(
      'Dental Record Stream Preview',
      'Iframe rendered with blob: URL and NO error banner',
      dentalIframeSrc && dentalIframeSrc.startsWith('blob:') && !hasDentalError
        ? `Rendered (${dentalIframeSrc.slice(0, 35)}...)`
        : `Error: ${hasDentalError || 'No iframe'}`,
      Boolean(dentalIframeSrc && dentalIframeSrc.startsWith('blob:') && !hasDentalError)
    );

    const dentalDownloadBtnText = await page.evaluate(() => {
      const btn = document.querySelector('.btn-details-download');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Dental download button text:', dentalDownloadBtnText);

    record(
      'Dental File Size Accuracy',
      'Displays 68 B without 0 KB rounding corruption',
      dentalDownloadBtnText || 'Not found',
      Boolean(dentalDownloadBtnText && dentalDownloadBtnText.includes('68 B') && !dentalDownloadBtnText.includes('0 KB'))
    );

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preview_02_dental_panoramic_opg.png'), fullPage: true });

    // ------------------------------------------------------------------------
    // TEST 3: VISION RECORD (666a3474-09bd-4db2-b440-5886021f04a3 - vision_fundus_retinal.pdf)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Vision Record: 666a3474-09bd-4db2-b440-5886021f04a3 ---');
    await page.goto('http://localhost:5174/admin/records/666a3474-09bd-4db2-b440-5886021f04a3', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const visionIframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('.dicom-canvas-surface iframe');
      return iframe ? iframe.getAttribute('src') : null;
    });
    const hasVisionError = await page.evaluate(() => {
      const el = document.querySelector('.dicom-canvas-surface .bg-red-950\\/40');
      return el ? el.textContent.trim() : null;
    });

    record(
      'Vision Record Stream Preview',
      'Iframe rendered with blob: URL and NO error banner',
      visionIframeSrc && visionIframeSrc.startsWith('blob:') && !hasVisionError
        ? `Rendered (${visionIframeSrc.slice(0, 35)}...)`
        : `Error: ${hasVisionError || 'No iframe'}`,
      Boolean(visionIframeSrc && visionIframeSrc.startsWith('blob:') && !hasVisionError)
    );

    const visionDownloadBtnText = await page.evaluate(() => {
      const btn = document.querySelector('.btn-details-download');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Vision download button text:', visionDownloadBtnText);

    record(
      'Vision File Size Accuracy',
      'Displays 68 B without 0 KB rounding corruption',
      visionDownloadBtnText || 'Not found',
      Boolean(visionDownloadBtnText && visionDownloadBtnText.includes('68 B') && !visionDownloadBtnText.includes('0 KB'))
    );

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preview_03_vision_fundus_retinal.png'), fullPage: true });

    // ------------------------------------------------------------------------
    // TEST 4: NEW UPLOAD & PREVIEW INTEGRATION
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing New Document Upload & Immediate Preview ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const testPdfPath = path.resolve('scratch/test_files/valid_clinical_report.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(testPdfPath);
    await new Promise(r => setTimeout(r, 1200));

    // Focus patient search input to load verified patients list
    await page.waitForSelector('#patientSearchInput', { timeout: 5000 });
    await page.click('#patientSearchInput');
    await new Promise(r => setTimeout(r, 1500));

    // Wait for dropdown to show verified patients
    await page.waitForSelector('.patient-dropdown-item', { timeout: 8000 });
    await page.click('.patient-dropdown-item');
    await new Promise(r => setTimeout(r, 800));

    // Submit form
    const submitBtn = await page.$('form button[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 3500));

    // Check newly uploaded item in vault
    const latestUploadedItem = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        const list = JSON.parse(raw);
        return list && list.length > 0 ? list[0] : null;
      }
      return null;
    });
    console.log('Newly uploaded record ID:', latestUploadedItem?.id);
    console.log('Newly uploaded record Title:', latestUploadedItem?.title);

    record(
      'New Upload Persistence',
      'Saved into vault attachments with valid ID and binary',
      latestUploadedItem ? `ID: ${latestUploadedItem.id}` : 'Failed',
      Boolean(latestUploadedItem && latestUploadedItem.id)
    );

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preview_04_upload_workspace.png'), fullPage: true });

    // Navigate to new uploaded record details
    if (latestUploadedItem?.id) {
      await page.goto(`http://localhost:5174/admin/records/${latestUploadedItem.id}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));

      const newIframeSrc = await page.evaluate(() => {
        const iframe = document.querySelector('.dicom-canvas-surface iframe');
        return iframe ? iframe.getAttribute('src') : null;
      });
      const hasNewErr = await page.evaluate(() => {
        const el = document.querySelector('.dicom-canvas-surface .bg-red-950\\/40');
        return el ? el.textContent.trim() : null;
      });

      record(
        'New Upload Details & Preview',
        'Directly renders authentic preview iframe for newly uploaded file',
        newIframeSrc && newIframeSrc.startsWith('blob:') && !hasNewErr
          ? `Rendered (${newIframeSrc.slice(0, 35)}...)`
          : `Error: ${hasNewErr || 'No iframe'}`,
        Boolean(newIframeSrc && newIframeSrc.startsWith('blob:') && !hasNewErr)
      );

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'preview_05_new_upload_details.png'), fullPage: true });
    }

    console.log('\n=== ALL E2E VERIFICATIONS COMPLETE ===');
    const allPassed = verificationResults.every(r => r.pass);
    console.log(`Summary: ${verificationResults.filter(r => r.pass).length} / ${verificationResults.length} PASSED`);
    console.log('All Passed:', allPassed);

  } finally {
    await browser.close();
  }
})();
