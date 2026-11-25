const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getFreshToken, apiGet } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

// Test files creation
const TEST_DIR = path.resolve('scratch/test_files');
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

// 1. Valid PDF
const validPdfPath = path.join(TEST_DIR, 'valid_clinical_report.pdf');
fs.writeFileSync(validPdfPath, `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
186
%%EOF`);

// 2. Valid PNG (1x1 pixel)
const validPngPath = path.join(TEST_DIR, 'valid_scan.png');
fs.writeFileSync(validPngPath, Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
  0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
  0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]));

// 3. Valid JPG
const validJpgPath = path.join(TEST_DIR, 'valid_photo.jpg');
fs.writeFileSync(validJpgPath, Buffer.from([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
  0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04,
  0xFF, 0xD9
]));

// 4. Corrupted / Fake PDF (Plain text renamed to .pdf)
const corruptedPdfPath = path.join(TEST_DIR, 'corrupted_plain_text.pdf');
fs.writeFileSync(corruptedPdfPath, 'This is a text file with no PDF header at all.');

// 5. Renamed HTML error file (326 bytes HTML pretending to be .pdf)
const htmlPdfPath = path.join(TEST_DIR, 'html_error_response.pdf');
fs.writeFileSync(htmlPdfPath, '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested resource could not be found on this server. Please contact your system administrator if you believe this is an error in server routing.</p><hr><address>Apache Server at staging.vnvision.in Port 443</address></body></html>');

// 6. Empty file (0 bytes)
const emptyFilePath = path.join(TEST_DIR, 'empty_zero_byte.pdf');
fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

// 7. Large file (>15MB)
const largeFilePath = path.join(TEST_DIR, 'large_file_over_15mb.pdf');
if (!fs.existsSync(largeFilePath) || fs.statSync(largeFilePath).size < 16 * 1024 * 1024) {
  const bigBuf = Buffer.alloc(16 * 1024 * 1024 + 100);
  bigBuf.write('%PDF-1.4\n', 0);
  fs.writeFileSync(largeFilePath, bigBuf);
}

(async () => {
  console.log('=== CAREID ADMIN HEALTH RECORD UPLOAD FORENSIC VERIFICATION ===\n');

  const token = await getFreshToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';
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

    // Navigate to Upload page
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    console.log('Current page URL:', page.url());
    await page.waitForSelector('input[type="file"]', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    // SCENARIO 1: Empty File Validation
    console.log('\n--- Test 1: Empty file (0 bytes) ---');
    let fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(emptyFilePath);
    await new Promise(r => setTimeout(r, 800));

    let errText = await page.evaluate(() => {
      const el = document.querySelector('.bg-rose-50');
      return el ? el.textContent.trim() : null;
    });
    recordResult(
      'Empty file (0 bytes)',
      'Rejected by client validation with clear error',
      errText || 'No error shown',
      Boolean(errText && errText.includes('empty (0 bytes)')),
      { errText }
    );

    // SCENARIO 2: Over 15MB File Validation
    console.log('\n--- Test 2: File above 15MB limit (16MB) ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(largeFilePath);
    await new Promise(r => setTimeout(r, 800));

    errText = await page.evaluate(() => {
      const el = document.querySelector('.bg-rose-50');
      return el ? el.textContent.trim() : null;
    });
    recordResult(
      'File above 15MB limit',
      'Rejected by client validation explaining 15MB limit',
      errText || 'No error shown',
      Boolean(errText && errText.includes('15MB')),
      { errText }
    );

    // SCENARIO 3: Corrupted PDF (Plain text renamed to .pdf)
    console.log('\n--- Test 3: Corrupted PDF (plain text renamed to .pdf) ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(corruptedPdfPath);
    await new Promise(r => setTimeout(r, 800));

    errText = await page.evaluate(() => {
      const el = document.querySelector('.bg-rose-50');
      return el ? el.textContent.trim() : null;
    });
    recordResult(
      'Corrupted PDF (plain text)',
      'Rejected with signature validation error',
      errText || 'No error shown',
      Boolean(errText && errText.includes('%PDF- header missing')),
      { errText }
    );

    // SCENARIO 4: Renamed HTML error file (326 bytes HTML pretending to be .pdf)
    console.log('\n--- Test 4: Renamed HTML error file (326 bytes) ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(htmlPdfPath);
    await new Promise(r => setTimeout(r, 800));

    errText = await page.evaluate(() => {
      const el = document.querySelector('.bg-rose-50');
      return el ? el.textContent.trim() : null;
    });
    recordResult(
      'Renamed HTML file (326 bytes)',
      'Rejected with signature validation error',
      errText || 'No error shown',
      Boolean(errText && errText.includes('%PDF- header missing')),
      { errText }
    );

    // Capture screenshot of validation error
    const valShotPath = path.join(ARTIFACTS_DIR, 'upload_validation_error.png');
    await page.screenshot({ path: valShotPath, fullPage: true });

    // SCENARIO 5: Invalid Patient Care ID Check
    console.log('\n--- Test 5: Invalid Patient Care ID ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPdfPath);
    await new Promise(r => setTimeout(r, 1200));

    // Clear and type invalid ID
    await page.click('#patientId', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#patientId', 'PT-INVALID-999999');
    await new Promise(r => setTimeout(r, 600));

    let submitBtn = await page.$('form button[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 3000));

    const toastOrErr = await page.evaluate(() => {
      const toast = document.querySelector('.fixed.top-5');
      return toast ? toast.textContent.trim() : null;
    });
    recordResult(
      'Invalid Patient Care ID',
      'Upload rejected with patient lookup error',
      toastOrErr || 'Server rejection feedback',
      Boolean(toastOrErr && toastOrErr.includes('Patient not found'))
    );

    // SCENARIO 6: Valid PDF Upload & Backend Database Persistence
    console.log('\n--- Test 6: Valid PDF Upload & Backend Verification ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPdfPath);
    await new Promise(r => setTimeout(r, 1200));

    // Type valid patient Care ID
    await page.click('#patientId', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#patientId', patientNumber);
    await new Promise(r => setTimeout(r, 1200));

    // Verify patient resolved on screen
    const resolvedLabel = await page.evaluate(() => {
      const badge = document.querySelector('.text-emerald-700');
      return badge ? badge.textContent.trim() : null;
    });
    console.log('Real-time patient resolution:', resolvedLabel);

    submitBtn = await page.$('form button[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 4500));

    // Read stored vault attachments from localStorage to get the uploaded PDF ID
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

    // Verify file streaming from backend for the uploaded PDF
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

    // SCENARIO 7: Valid PNG Upload
    console.log('\n--- Test 7: Valid PNG Upload ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validPngPath);
    await new Promise(r => setTimeout(r, 1200));

    // Type patient ID again since reset cleared it
    await page.click('#patientId', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#patientId', patientNumber);
    await new Promise(r => setTimeout(r, 800));

    // Category Dental
    await page.select('#category', 'Dental');
    await new Promise(r => setTimeout(r, 400));

    submitBtn = await page.$('form button[type="submit"]');
    await submitBtn.click();
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

    // SCENARIO 8: Valid JPG Upload
    console.log('\n--- Test 8: Valid JPG Upload ---');
    fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(validJpgPath);
    await new Promise(r => setTimeout(r, 1200));

    // Type patient ID
    await page.click('#patientId', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('#patientId', patientNumber);
    await new Promise(r => setTimeout(r, 800));

    // Category Vision
    await page.select('#category', 'Vision');
    await new Promise(r => setTimeout(r, 400));

    submitBtn = await page.$('form button[type="submit"]');
    await submitBtn.click();
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

    // Capture screenshot of upload workspace with recent uploads
    const successShotPath = path.join(ARTIFACTS_DIR, 'upload_workspace_success.png');
    await page.screenshot({ path: successShotPath, fullPage: true });

    // SCENARIO 9: Patient Timeline Persistence Verification
    console.log('\n--- Test 9: Patient Timeline Attachment Persistence ---');
    const timelineRes = await apiGet(`/api/v1/admin/patients/${patientProfileId}/medical-records/timeline`);
    const timelineItems = timelineRes.body?.data || [];
    const foundInTimeline = timelineItems.some(x => x.id === uploadedPdfRecord?.id || x.id === uploadedPngRecord?.id || x.id === uploadedJpgRecord?.id);
    console.log('Attachments found in patient timeline:', foundInTimeline);
    recordResult(
      'Patient Timeline Association',
      'Uploaded attachment exists in patient medical timeline',
      foundInTimeline ? 'Attachment present in patient timeline' : 'Not found in timeline',
      foundInTimeline
    );

    // SCENARIO 10: Browser Refresh Persistence
    console.log('\n--- Test 10: Browser Refresh Persistence ---');
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

    // SCENARIO 11: Record Details Navigation
    console.log('\n--- Test 11: Navigate to Record Details ---');
    if (uploadedPdfRecord?.id) {
      await page.goto(`http://localhost:5174/admin/records/${uploadedPdfRecord.id}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2500));

      const hasIframe = await page.evaluate(() => Boolean(document.querySelector('iframe')));
      console.log('Record details displays authentic PDF iframe:', hasIframe);
      recordResult(
        'Record Details Navigation',
        'Record details loads authentic embedded document viewer',
        hasIframe ? 'Original PDF iframe rendered' : 'Failed',
        hasIframe
      );

      const detailsShotPath = path.join(ARTIFACTS_DIR, 'upload_details_verified.png');
      await page.screenshot({ path: detailsShotPath, fullPage: true });
    }

    console.log('\n=== ALL FORENSIC SCENARIOS COMPLETED ===');
    console.log(JSON.stringify(testResults, null, 2));

  } finally {
    await browser.close();
  }
})();
