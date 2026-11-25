const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('--- Launching Puppeteer ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Check or Perform Login
  console.log('Navigating to http://localhost:5174/login ...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const phoneInput = await page.$('input[type="tel"], input[name="phone"], input[placeholder*="phone" i], input[placeholder*="+1" i]');
  if (phoneInput) {
    console.log('Logging in via UI...');
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.type('+16505550001');

    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text.includes('Send') || text.includes('OTP') || text.includes('Code') || text.includes('Continue')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1500));

    // Fill OTP
    const otpInput = await page.$('input[name="otp"], input[placeholder*="OTP" i], input[placeholder*="code" i], input[maxlength="6"], input[type="text"]');
    if (otpInput) {
      await otpInput.type('123456');
      const submitButtons = await page.$$('button');
      for (const b of submitButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Verify') || text.includes('Sign In') || text.includes('Login')) {
          await b.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // 2. Navigate to Upload Workspace
  console.log('Navigating to Upload Workspace http://localhost:5174/admin/records/upload ...');
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const shot1 = path.join(ARTIFACT_DIR, 'record_upload_workspace.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('Captured 1:', shot1);

  // 3. Fill Upload Form
  console.log('Filling upload form with Vision record...');
  // Patient ID
  const patientInput = await page.$('input[placeholder*="CID-" i], input[name="patientId"], input[placeholder*="Care ID" i]');
  if (patientInput) {
    await patientInput.click({ clickCount: 3 });
    await patientInput.type('CID-249015');
  }

  // Select Vision Category
  const categorySelect = await page.$('select[name="category"], select');
  if (categorySelect) {
    await categorySelect.select('Vision');
  }

  // Record Type
  const recordTypeInput = await page.$('input[name="recordType"], input[placeholder*="Record Type" i], input[placeholder*="Diagnostic" i]');
  if (recordTypeInput) {
    await recordTypeInput.click({ clickCount: 3 });
    await recordTypeInput.type('Vision Fundus Retinal Scan');
  }

  // Provider
  const providerInput = await page.$('input[name="provider"], input[placeholder*="Provider" i], input[placeholder*="Physician" i]');
  if (providerInput) {
    await providerInput.click({ clickCount: 3 });
    await providerInput.type('Dr. Elena Rostova');
  }

  // Facility
  const facilityInput = await page.$('input[name="facility"], input[placeholder*="Facility" i], input[placeholder*="Hospital" i]');
  if (facilityInput) {
    await facilityInput.click({ clickCount: 3 });
    await facilityInput.type('Horizon Vision Center');
  }

  // Summary
  const summaryInput = await page.$('textarea[name="summary"], textarea[placeholder*="Summary" i], textarea');
  if (summaryInput) {
    await summaryInput.click({ clickCount: 3 });
    await summaryInput.type('Bilateral high-resolution fundus retinal imaging and macula diagnostic evaluation.');
  }

  // File Upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    const uploadPath = path.resolve('scratch/vision_fundus_retinal.pdf');
    await fileInput.uploadFile(uploadPath);
    console.log('Attached file:', uploadPath);
  }
  await new Promise(r => setTimeout(r, 1000));

  // Submit Upload Form
  console.log('Submitting upload form...');
  const uploadButton = await page.$('form button[type="submit"]');
  if (uploadButton) {
    await uploadButton.click();
    console.log('Clicked upload button, waiting for response...');
    await new Promise(r => setTimeout(r, 3500));
  }

  const shot2 = path.join(ARTIFACT_DIR, 'record_upload_success.png');
  await page.screenshot({ path: shot2, fullPage: true });
  console.log('Captured 2:', shot2);

  // 4. Navigate to Vision Records
  console.log('Navigating to Vision Records http://localhost:5174/admin/records/vision ...');
  await page.goto('http://localhost:5174/admin/records/vision', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const shot3 = path.join(ARTIFACT_DIR, 'vision_records_directory.png');
  await page.screenshot({ path: shot3, fullPage: true });
  console.log('Captured 3:', shot3);

  // 5. Open Record Detail Modal
  console.log('Opening Record Details modal on Vision page...');
  const viewBtn = await page.$('.btn-category-row-view');
  if (viewBtn) {
    await viewBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    const shot4 = path.join(ARTIFACT_DIR, 'vision_record_detail_modal.png');
    await page.screenshot({ path: shot4, fullPage: true });
    console.log('Captured 4:', shot4);
  }

  // 6. Navigate to Dental Records
  console.log('Navigating to Dental Records http://localhost:5174/admin/records/dental ...');
  await page.goto('http://localhost:5174/admin/records/dental', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const shot5 = path.join(ARTIFACT_DIR, 'dental_records_directory.png');
  await page.screenshot({ path: shot5, fullPage: true });
  console.log('Captured 5:', shot5);

  // 7. Navigate to Medical Records
  console.log('Navigating to Medical Records http://localhost:5174/admin/records/medical ...');
  await page.goto('http://localhost:5174/admin/records/medical', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const shot6 = path.join(ARTIFACT_DIR, 'medical_records_directory.png');
  await page.screenshot({ path: shot6, fullPage: true });
  console.log('Captured 6:', shot6);

  await browser.close();
  console.log('--- ALL E2E SCREENSHOTS CAPTURED SUCCESSFULLY ---');
})();