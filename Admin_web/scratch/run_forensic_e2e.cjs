const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getFreshToken, apiGet } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const TEST_DIR = path.resolve('scratch/test_files');
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

// Test files
const validPdfPath = path.join(TEST_DIR, 'valid_clinical_report.pdf');
const validPngPath = path.join(TEST_DIR, 'valid_scan.png');
const validJpgPath = path.join(TEST_DIR, 'valid_photo.jpg');
const corruptedPdfPath = path.join(TEST_DIR, 'corrupted_plain_text.pdf');
const htmlPdfPath = path.join(TEST_DIR, 'html_error_response.pdf');
const emptyFilePath = path.join(TEST_DIR, 'empty_zero_byte.pdf');
const largeFilePath = path.join(TEST_DIR, 'large_file_over_15mb.pdf');

(async () => {
  console.log('=== STARTING FORENSIC E2E VERIFICATION SUITE ===\n');

  const token = await getFreshToken();
  const patientUUID = '787e5187-7859-4320-bb1a-465a57dd086a';
  const patientNumber = 'PT-CAREID-2026-0004';

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const testResults = [];
  function recordResult(scenario, expected, actual, passed, details = {}) {
    testResults.push({ scenario, expected, actual, passed, details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${scenario}: ${actual}`);
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Seed session token
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

    // 1. Empty file (0 bytes)
    console.log('\n--- Scenario 1: Empty file (0 bytes) ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    let fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(emptyFilePath);
    await new Promise(r => setTimeout(r, 600));

    let errText = await page.evaluate(() => document.querySelector('.bg-rose-50')?.textContent?.trim());
    recordResult(
      'Empty file (0 bytes)',
      'Rejected by client validation with clear error',
      errText || 'No error shown',
      Boolean(errText && errText.includes('empty (0 bytes)')),
      { errText }
    );

    // 2. Over 15MB file (16MB)
    console.log('\n--- Scenario 2: Over 15MB file (16MB) ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(largeFilePath);
    await new Promise(r => setTimeout(r, 600));

    errText = await page.evaluate(() => document.querySelector('.bg-rose-50')?.textContent?.trim());
    recordResult(
      'File above 15MB limit',
      'Rejected by client validation explaining 15MB limit',
      errText || 'No error shown',
      Boolean(errText && errText.includes('15MB')),
      { errText }
    );

    // 3. Corrupted plain text renamed to .pdf
    console.log('\n--- Scenario 3: Corrupted PDF (Plain text renamed to .pdf) ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(corruptedPdfPath);
    await new Promise(r => setTimeout(r, 600));

    errText = await page.evaluate(() => document.querySelector('.bg-rose-50')?.textContent?.trim());
    recordResult(
      'Corrupted PDF (plain text)',
      'Rejected with signature validation error (%PDF- header missing)',
      errText || 'No error shown',
      Boolean(errText && errText.includes('%PDF- header missing')),
      { errText }
    );

    // 4. Renamed HTML error file (326 bytes)
    console.log('\n--- Scenario 4: Renamed HTML error file (326 bytes) ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(htmlPdfPath);
    await new Promise(r => setTimeout(r, 600));

    errText = await page.evaluate(() => document.querySelector('.bg-rose-50')?.textContent?.trim());
    recordResult(
      'Renamed HTML file (326 bytes)',
      'Rejected with signature validation error (%PDF- header missing)',
      errText || 'No error shown',
      Boolean(errText && errText.includes('%PDF- header missing')),
      { errText }
    );

    // Capture screenshot: upload_validation_error.png
    const valShotPath = path.join(ARTIFACTS_DIR, 'upload_validation_error.png');
    await page.screenshot({ path: valShotPath, fullPage: true });

    // 5. Invalid Patient ID check
    console.log('\n--- Scenario 5: Invalid Patient Care ID ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPdfPath);
    await new Promise(r => setTimeout(r, 800));

    await page.type('#patientId', 'PT-INVALID-99999');
    await new Promise(r => setTimeout(r, 500));
    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 3000));

    const invalidToast = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
    recordResult(
      'Invalid Patient Care ID',
      'Upload rejected with patient lookup error',
      invalidToast || 'Server rejection feedback',
      Boolean(invalidToast && invalidToast.includes('Patient not found'))
    );

    // 6. Valid PDF Upload & Backend Database Persistence
    console.log('\n--- Scenario 6: Valid PDF Upload & Backend Verification ---');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="file"]');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPdfPath);
    await new Promise(r => setTimeout(r, 800));

    await page.type('#patientId', patientUUID);
    await new Promise(r => setTimeout(r, 800));

    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 4500));

    const uploadedPdfRecord = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        const list = JSON.parse(raw);
        return list && list.length > 0 ? list[0] : null;
      }
      return null;
    });

    console.log('Uploaded PDF Attachment ID:', uploadedPdfRecord?.id);
    console.log('Uploaded PDF Attachment File:', uploadedPdfRecord?.attachments?.[0]?.fileName);

    recordResult(
      'Valid PDF Upload',
      'HTTP 201 Created from backend /api/v1/attachments',
      uploadedPdfRecord ? `Uploaded ID: ${uploadedPdfRecord.id}` : 'Failed',
      Boolean(uploadedPdfRecord?.id)
    );

    // Stream verification
    let pdfStreamOk = false;
    if (uploadedPdfRecord?.attachments?.[0]?.fileName) {
      const pdfFileName = uploadedPdfRecord.attachments[0].fileName;
      const streamRes = await new Promise((resolve) => {
        https.get({
          hostname: '360api.vnvision.in',
          path: `/api/v1/attachments/file/${encodeURIComponent(pdfFileName)}`,
          headers: { Authorization: `Bearer ${token}` }
        }, res => resolve({ status: res.statusCode, type: res.headers['content-type'] }));
      });
      pdfStreamOk = streamRes.status === 200;
      console.log('Backend stream verification for PDF:', streamRes.status, streamRes.type);
    }
    recordResult(
      'PDF Backend Stream Verification',
      'GET /api/v1/attachments/file/:filename returns 200 OK binary',
      pdfStreamOk ? '200 OK stream confirmed' : 'Stream failed',
      pdfStreamOk
    );

    // 7. Valid PNG Upload (Dental)
    console.log('\n--- Scenario 7: Valid PNG Upload (Dental) ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPngPath);
    await new Promise(r => setTimeout(r, 800));

    await page.type('#patientId', patientUUID);
    await page.select('#category', 'Dental');
    await new Promise(r => setTimeout(r, 400));

    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 4500));

    const uploadedPngRecord = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        const list = JSON.parse(raw);
        return list && list.length > 0 ? list[0] : null;
      }
      return null;
    });
    console.log('Uploaded PNG Attachment ID:', uploadedPngRecord?.id);

    let pngStreamOk = false;
    if (uploadedPngRecord?.attachments?.[0]?.fileName) {
      const pngFileName = uploadedPngRecord.attachments[0].fileName;
      const streamRes = await new Promise((resolve) => {
        https.get({
          hostname: '360api.vnvision.in',
          path: `/api/v1/attachments/file/${encodeURIComponent(pngFileName)}`,
          headers: { Authorization: `Bearer ${token}` }
        }, res => resolve({ status: res.statusCode, type: res.headers['content-type'] }));
      });
      pngStreamOk = streamRes.status === 200;
      console.log('Backend stream verification for PNG:', streamRes.status, streamRes.type);
    }
    recordResult(
      'Valid PNG Upload & Stream',
      'HTTP 201 Created and stream 200 OK',
      pngStreamOk ? `200 OK stream (ID: ${uploadedPngRecord.id})` : 'Stream failed',
      pngStreamOk
    );

    // 8. Valid JPG Upload (Vision)
    console.log('\n--- Scenario 8: Valid JPG Upload (Vision) ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validJpgPath);
    await new Promise(r => setTimeout(r, 800));

    await page.type('#patientId', patientUUID);
    await page.select('#category', 'Vision');
    await new Promise(r => setTimeout(r, 400));

    await page.click('form button[type="submit"]');
    await new Promise(r => setTimeout(r, 4500));

    const uploadedJpgRecord = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        const list = JSON.parse(raw);
        return list && list.length > 0 ? list[0] : null;
      }
      return null;
    });
    console.log('Uploaded JPG Attachment ID:', uploadedJpgRecord?.id);

    let jpgStreamOk = false;
    if (uploadedJpgRecord?.attachments?.[0]?.fileName) {
      const jpgFileName = uploadedJpgRecord.attachments[0].fileName;
      const streamRes = await new Promise((resolve) => {
        https.get({
          hostname: '360api.vnvision.in',
          path: `/api/v1/attachments/file/${encodeURIComponent(jpgFileName)}`,
          headers: { Authorization: `Bearer ${token}` }
        }, res => resolve({ status: res.statusCode, type: res.headers['content-type'] }));
      });
      jpgStreamOk = streamRes.status === 200;
      console.log('Backend stream verification for JPG:', streamRes.status, streamRes.type);
    }
    recordResult(
      'Valid JPG Upload & Stream',
      'HTTP 201 Created and stream 200 OK',
      jpgStreamOk ? `200 OK stream (ID: ${uploadedJpgRecord.id})` : 'Stream failed',
      jpgStreamOk
    );

    // Capture screenshot: upload_workspace_success.png
    const successShotPath = path.join(ARTIFACTS_DIR, 'upload_workspace_success.png');
    await page.screenshot({ path: successShotPath, fullPage: true });

    // 9. Patient Timeline Association
    console.log('\n--- Scenario 9: Patient Timeline Association ---');
    const timelineRes = await apiGet(`/api/v1/admin/patients/${patientUUID}/medical-records/timeline`);
    const timelineItems = timelineRes.body?.data || [];
    const foundInTimeline = timelineItems.some(x => x.id === uploadedPdfRecord?.id || x.id === uploadedPngRecord?.id || x.id === uploadedJpgRecord?.id);
    console.log('Attachments found in patient timeline:', foundInTimeline);
    recordResult(
      'Patient Timeline Association',
      'Uploaded attachment exists in patient medical timeline',
      foundInTimeline ? 'Attachment present in patient timeline' : 'Not found in timeline',
      foundInTimeline
    );

    // 10. Browser Refresh Persistence
    console.log('\n--- Scenario 10: Browser Refresh Persistence ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const recentCountAfterReload = await page.evaluate(() => {
      const rows = document.querySelectorAll('.upload-side-card .bg-white');
      return rows.length;
    });
    console.log('Recent uploads count after reload:', recentCountAfterReload);
    recordResult(
      'Browser Refresh Persistence',
      'Recent uploads remain visible and populated after reload',
      recentCountAfterReload > 0 ? `${recentCountAfterReload} items retained` : 'Empty',
      recentCountAfterReload > 0
    );

    // 11. Record Details Navigation & Authentic Document Viewer
    console.log('\n--- Scenario 11: Navigate to Record Details ---');
    if (uploadedPdfRecord?.id) {
      await page.goto(`http://localhost:5174/admin/records/${uploadedPdfRecord.id}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));

      const hasIframe = await page.evaluate(() => Boolean(document.querySelector('iframe')));
      console.log('Record details displays authentic PDF iframe:', hasIframe);
      recordResult(
        'Record Details Navigation',
        'Record details loads authentic embedded document viewer',
        hasIframe ? 'Original PDF iframe rendered' : 'Failed',
        hasIframe
      );

      // Capture screenshot: upload_details_verified.png
      const detailsShotPath = path.join(ARTIFACTS_DIR, 'upload_details_verified.png');
      await page.screenshot({ path: detailsShotPath, fullPage: true });
    }

    console.log('\n=== ALL FORENSIC SCENARIOS COMPLETED ===');
    console.log(JSON.stringify(testResults, null, 2));

  } finally {
    await browser.close();
  }
})();

