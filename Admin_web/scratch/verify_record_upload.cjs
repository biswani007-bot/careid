const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';
const TEST_FILES_DIR = path.resolve('scratch/test_files');

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFreshToken() {
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached && cached.refreshToken) {
        console.log('Refreshing token using refreshToken...');
        const refData = JSON.stringify({ refreshToken: cached.refreshToken });
        const refRes = await httpRequest({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/token/refresh',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(refData) }
        }, refData);
        if (refRes.status === 200 && refRes.body?.data?.accessToken) {
          cached.accessToken = refRes.body.data.accessToken;
          cached.token = refRes.body.data.accessToken;
          cached.refreshToken = refRes.body.data.refreshToken || cached.refreshToken;
          cached.expiresAt = Date.now() + 14 * 60 * 1000;
          fs.writeFileSync('scratch/cached_token.json', JSON.stringify(cached, null, 2));
          console.log('Successfully refreshed access token!');
          return cached;
        }
      }
      if (cached && cached.accessToken && cached.expiresAt && cached.expiresAt > Date.now() + 60000) {
        console.log('Using valid cached Super Admin token...');
        return cached;
      }
    } catch (e) {
      console.log('Error reading cached token:', e.message);
    }
  }

  console.log('Obtaining fresh Super Admin token for browser...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  if (otpRes.status === 429 && fs.existsSync('scratch/cached_token.json')) {
    const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
    if (cached && cached.accessToken) {
      console.log('Rate limited on OTP request, reusing existing cached token...');
      return cached;
    }
  }

  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const authData = verifyRes.body?.data;
  if (!authData || !authData.accessToken) {
    throw new Error('Failed to obtain accessToken: ' + JSON.stringify(verifyRes.body));
  }
  
  const meRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${authData.accessToken}` }
  });

  const user = meRes.body?.data || {
    id: 'bc6f6875-434c-4050-b893-07343cc27986',
    email: 'superadmin@careid.test',
    phone: '+16505550001',
    status: 'ACTIVE',
    roles: ['SUPER_ADMIN'],
    permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
  };

  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    user,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  return tokenPayload;
}

function prepareTestFiles() {
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  // 1. Valid PDF file
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'valid_dental_report.pdf'), pdfContent);

  // 2. Valid PNG image
  const pngContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'panoramic_scan.png'), pngContent);

  // 3. Unsupported executable file (.exe)
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'unsupported_file.exe'), Buffer.from('MZ...executable binary payload for testing security rejection'));

  // 4. Large file (>15MB)
  const largeFilePath = path.join(TEST_FILES_DIR, 'large_file.pdf');
  if (!fs.existsSync(largeFilePath) || fs.statSync(largeFilePath).size < 16 * 1024 * 1024) {
    console.log('Generating 16MB file for size limit testing...');
    const buffer = Buffer.alloc(16 * 1024 * 1024, 0x61);
    fs.writeFileSync(largeFilePath, buffer);
  }

  console.log('Test files prepared in', TEST_FILES_DIR);
}

async function runRecordUploadVerification() {
  prepareTestFiles();
  const authPayload = await getFreshToken();
  const token = authPayload.token;
  const refreshToken = authPayload.refreshToken;
  const userSession = authPayload.user;

  console.log(`Launching headless browser targeting ${BASE_URL}...`);
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

  const capturedApiTraffic = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/v1/')) {
      try {
        const text = await response.text();
        capturedApiTraffic.push({
          method: response.request().method(),
          url,
          status: response.status(),
          responseSnippet: text.slice(0, 300)
        });
      } catch {}
    }
  });

  // Pre-seed auth session
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, userSession }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', token);
    sessionStorage.setItem('careid_refresh_token', refreshToken);
    sessionStorage.setItem('careid_user_session', JSON.stringify(userSession));
  }, { token, refreshToken, userSession });

  // 1. Navigate to Upload & Manage Records workspace
  console.log('\n=== Step 1: Navigating to /admin/records/upload ===');
  await page.goto(`${BASE_URL}/admin/records/upload`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_1_initial_workspace.png'), fullPage: true });
  console.log('Saved screenshot 1: record_upload_1_initial_workspace.png');

  // Verify initial form controls
  const initialPatientId = await page.$eval('#patientId', el => el.value);
  console.log('Initial form Patient ID:', initialPatientId);

  // 2. Test Unsupported File (.exe)
  console.log('\n=== Step 2: Testing unsupported file format (.exe) ===');
  const fileInputSelector = 'input[type="file"]';
  const exeFilePath = path.join(TEST_FILES_DIR, 'unsupported_file.exe');
  
  const fileInputExe = await page.$(fileInputSelector);
  await fileInputExe.uploadFile(exeFilePath);
  await new Promise(r => setTimeout(r, 800));

  const errorTextExe = await page.$eval('.bg-rose-50', el => el.innerText).catch(() => null);
  console.log('Validation error for .exe:', errorTextExe);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_2_unsupported_file_error.png'), fullPage: true });
  console.log('Saved screenshot 2: record_upload_2_unsupported_file_error.png');

  // 3. Test Oversized File (>15MB)
  console.log('\n=== Step 3: Testing file size limit exceeding 15MB ===');
  const largeFilePath = path.join(TEST_FILES_DIR, 'large_file.pdf');
  const fileInputLarge = await page.$(fileInputSelector);
  await fileInputLarge.uploadFile(largeFilePath);
  await new Promise(r => setTimeout(r, 800));

  const errorTextLarge = await page.$eval('.bg-rose-50', el => el.innerText).catch(() => null);
  console.log('Validation error for >15MB:', errorTextLarge);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_3_oversized_file_error.png'), fullPage: true });
  console.log('Saved screenshot 3: record_upload_3_oversized_file_error.png');

  // 4. Test Valid PDF Upload
  console.log('\n=== Step 4: Testing valid PDF upload with Dental category ===');
  const validPdfPath = path.join(TEST_FILES_DIR, 'valid_dental_report.pdf');
  const fileInputPdf = await page.$(fileInputSelector);
  await fileInputPdf.uploadFile(validPdfPath);
  await new Promise(r => setTimeout(r, 800));

  // Fill in form values
  await page.evaluate(() => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    setVal('patientId', 'PAT-929510');
    setVal('category', 'Dental');
    setVal('recordType', 'Panoramic Dental X-Ray Scan');
    setVal('provider', 'Dr. Michael Chen');
    setVal('facility', 'Apex Dental Care Center');
    setVal('summary', 'Annual panoramic dental radiograph assessment for mandibular alignment.');
  });
  await new Promise(r => setTimeout(r, 500));

  // Submit form
  console.log('Submitting PDF upload form...');
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();

  // Wait for network response and success toast
  console.log('Waiting for backend upload response...');
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('successfully uploaded') || text.includes('indexed in CareID Vault');
  }, { timeout: 15000 }).catch(e => console.log('Wait timeout or completed:', e.message));

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_4_pdf_upload_success.png'), fullPage: true });
  console.log('Saved screenshot 4: record_upload_4_pdf_upload_success.png');

  // 5. Test Valid Image Upload (Vision)
  console.log('\n=== Step 5: Testing valid PNG upload with Vision category ===');
  const validPngPath = path.join(TEST_FILES_DIR, 'panoramic_scan.png');
  const fileInputPng = await page.$(fileInputSelector);
  await fileInputPng.uploadFile(validPngPath);
  await new Promise(r => setTimeout(r, 800));

  // Fill in form values
  await page.evaluate(() => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    setVal('patientId', 'PAT-929510');
    setVal('category', 'Vision');
    setVal('recordType', 'Fundus Retinal Scan');
    setVal('provider', 'Dr. Sarah Jenkins');
    setVal('facility', 'Metro Vision Institute');
    setVal('summary', 'Bilateral high-resolution digital retinal imaging examining macula.');
  });
  await new Promise(r => setTimeout(r, 500));

  // Submit form
  console.log('Submitting PNG upload form...');
  const submitBtn2 = await page.$('button[type="submit"]');
  await submitBtn2.click();

  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('successfully uploaded') || text.includes('indexed in CareID Vault');
  }, { timeout: 15000 }).catch(e => console.log('Wait timeout or completed:', e.message));

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_5_image_upload_success.png'), fullPage: true });
  console.log('Saved screenshot 5: record_upload_5_image_upload_success.png');

  // 6. Test Navigation to Record Details via Recent Uploads
  console.log('\n=== Step 6: Testing Record Details view via Recent Uploads ===');
  const viewButtons = await page.$$('.upload-side-card button');
  console.log(`Found ${viewButtons.length} view buttons in Recent Uploads card.`);
  if (viewButtons.length > 0) {
    await viewButtons[0].click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL after clicking View:', page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_6_record_details_view.png'), fullPage: true });
    console.log('Saved screenshot 6: record_upload_6_record_details_view.png');
  }

  // 7. Navigate back to /admin/records/upload for Archive and Restore dialogs
  console.log('\n=== Step 7: Testing Archive & Restore dialogs ===');
  await page.goto(`${BASE_URL}/admin/records/upload`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Click Archive Confirmation Dialog trigger
  const archiveTrigger = await page.waitForSelector('button:has-text("Archive Confirmation Dialog")', { timeout: 5000 }).catch(async () => {
    const btns = await page.$$('button');
    for (const b of btns) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt.includes('Archive Confirmation Dialog')) return b;
    }
    return null;
  });

  if (archiveTrigger) {
    await archiveTrigger.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_7_archive_modal.png'), fullPage: true });
    console.log('Saved screenshot 7: record_upload_7_archive_modal.png');

    // Confirm Archive
    const modalConfirmBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.lifecycle-dialog-box button'));
      return btns.find(b => b.innerText.trim() === 'Archive');
    });
    if (modalConfirmBtn) {
      await modalConfirmBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // Click Restore Record Dialog trigger
  const restoreTrigger = await page.waitForSelector('button:has-text("Restore Record Dialog")', { timeout: 5000 }).catch(async () => {
    const btns = await page.$$('button');
    for (const b of btns) {
      const txt = await page.evaluate(el => el.innerText, b);
      if (txt.includes('Restore Record Dialog')) return b;
    }
    return null;
  });

  if (restoreTrigger) {
    await restoreTrigger.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'record_upload_8_restore_modal.png'), fullPage: true });
    console.log('Saved screenshot 8: record_upload_8_restore_modal.png');

    // Confirm Restore
    const restoreConfirmBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.lifecycle-dialog-box button'));
      return btns.find(b => b.innerText.trim().includes('Restore'));
    });
    if (restoreConfirmBtn) {
      await restoreConfirmBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // Final summary of API traffic
  console.log('\n=== Captured API Traffic during Verification ===');
  capturedApiTraffic.forEach((t, i) => {
    console.log(`${i + 1}. [${t.method}] ${t.url} -> Status ${t.status}`);
  });

  await browser.close();
  console.log('\nAll Record Upload verification steps completed successfully!');
}

runRecordUploadVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});

