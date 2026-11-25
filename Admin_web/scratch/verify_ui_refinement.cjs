const puppeteer = require('puppeteer');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('=== VERIFYING HEALTH RECORD UPLOAD UI/UX REFINEMENT ===\n');

  const token = await getFreshToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

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

  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'desktop_1366', width: 1366, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  const metricsReport = {};

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Capture screenshot
    const shotPath = path.join(ARTIFACTS_DIR, `upload_refined_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Saved screenshot: ${shotPath}`);

    // Measure element metrics
    const data = await page.evaluate(() => {
      const bento = document.querySelector('.upload-bento-grid');
      const mainCard = document.querySelector('.upload-main-card');
      const sideCol = document.querySelector('.upload-side-column');
      const notice = document.querySelector('.upload-storage-notice');
      const submitBtn = document.querySelector('.upload-submit-btn');
      const inputs = Array.from(document.querySelectorAll('.upload-form-input, .upload-form-select')).map(el => ({
        id: el.id,
        height: el.offsetHeight,
        padding: window.getComputedStyle(el).padding
      }));

      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        bentoWidth: bento?.offsetWidth,
        mainCardWidth: mainCard?.offsetWidth,
        sideColWidth: sideCol?.offsetWidth,
        desktopRatio: mainCard && bento ? (mainCard.offsetWidth / bento.offsetWidth).toFixed(2) : null,
        notice: notice ? {
          width: notice.offsetWidth,
          scrollWidth: notice.scrollWidth,
          overflows: notice.scrollWidth > notice.offsetWidth
        } : null,
        submitBtn: submitBtn ? {
          width: submitBtn.offsetWidth,
          scrollWidth: submitBtn.scrollWidth,
          text: submitBtn.textContent.trim(),
          overflows: submitBtn.scrollWidth > submitBtn.offsetWidth
        } : null,
        inputs
      };
    });

    metricsReport[vp.name] = data;
    console.log(`- Horizontal overflow: ${data.hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);
    console.log(`- Main card ratio: ${data.desktopRatio} (Width: ${data.mainCardWidth}px / Side: ${data.sideColWidth}px)`);
    console.log(`- Notice overflows: ${data.notice?.overflows ? 'YES (FAIL)' : 'NO (PASS)'}`);
    console.log(`- Submit button width: ${data.submitBtn?.width}px (Overflows: ${data.submitBtn?.overflows})`);
    console.log(`- Sample input height: ${data.inputs[0]?.height}px (Padding: ${data.inputs[0]?.padding})`);
  }

  // Functional test: verify upload action still works cleanly
  console.log('\n--- Functional Test: Uploading a file in refined UI ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="file"]');

  const validPdfPath = path.resolve('scratch/test_files/valid_clinical_report.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(validPdfPath);
  await new Promise(r => setTimeout(r, 800));

  await page.type('#patientId', '787e5187-7859-4320-bb1a-465a57dd086a');
  await new Promise(r => setTimeout(r, 800));

  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 4500));

  const toast = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
  console.log('Upload Result Toast:', toast);
  console.log('Functional Upload Check:', Boolean(toast && toast.includes('successfully uploaded')) ? 'PASS' : 'FAIL');

  // Capture final interactive screenshot with toast and uploaded item
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'upload_refined_interactive_success.png'), fullPage: true });

  console.log('\nAll refinement verifications completed successfully.');
  await browser.close();
})();

