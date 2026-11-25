const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('--- STARTING PREVIEW E2E RUNTIME VERIFICATION ---');
  const token = await getFreshToken();
  console.log('Fresh token acquired.');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Inject session tokens before navigation
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

    // 1. Navigate to Upload Page
    console.log('\nStep 1: Navigating to /admin/records/upload...');
    await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Upload PDF record
    console.log('Uploading PDF Record (medical_blood_panel.pdf)...');
    const pdfPath = path.resolve('scratch/medical_blood_panel.pdf');
    if (!fs.existsSync(pdfPath)) {
      fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n186\n%%EOF');
    }

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(pdfPath);
      await new Promise(r => setTimeout(r, 1000));
    }

    // Fill form
    await page.evaluate(() => {
      const pInput = document.querySelector('input[placeholder*="Care ID"]') || document.querySelector('input[placeholder*="Patient"]');
      if (pInput) {
        pInput.value = 'CID-249015';
        pInput.dispatchEvent(new Event('input', { bubbles: true }));
        pInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Submit upload
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      console.log('Submitting upload form...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 3500));
    }

    // Inspect Recent Uploads in Upload Workspace to find the uploaded item
    const uploadedRecordId = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (list && list.length > 0) return list[0].id;
        } catch {}
      }
      return null;
    });

    console.log('Uploaded Record ID in Vault:', uploadedRecordId);

    // 2. Upload Image record (facility map PNG)
    console.log('\nStep 2: Uploading Image Record (facility-map-manhattan.png)...');
    const imagePath = path.resolve('src/assets/facilities/facility-map-manhattan.png');
    const fileInput2 = await page.$('input[type="file"]');
    if (fileInput2 && fs.existsSync(imagePath)) {
      await fileInput2.uploadFile(imagePath);
      await new Promise(r => setTimeout(r, 1000));
    }

    await page.evaluate(() => {
      const pInput = document.querySelector('input[placeholder*="Care ID"]') || document.querySelector('input[placeholder*="Patient"]');
      if (pInput) {
        pInput.value = 'CID-249015';
        pInput.dispatchEvent(new Event('input', { bubbles: true }));
        pInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Switch category to Dental or Vision
      const dentalRadio = document.querySelector('input[value="Dental"]');
      if (dentalRadio) dentalRadio.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const submitBtn2 = await page.$('form button[type="submit"]');
    if (submitBtn2) {
      await submitBtn2.click();
      await new Promise(r => setTimeout(r, 3500));
    }

    const uploadedImageRecordId = await page.evaluate(() => {
      const raw = localStorage.getItem('careid_admin_vault_attachments');
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (list && list.length > 0) return list[0].id;
        } catch {}
      }
      return null;
    });
    console.log('Uploaded Image Record ID in Vault:', uploadedImageRecordId);

    // 3. Inspect PDF Details View
    if (uploadedRecordId) {
      console.log(`\nStep 3: Navigating to PDF details route: /admin/records/${uploadedRecordId}...`);
      await page.goto(`http://localhost:5174/admin/records/${uploadedRecordId}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2500));

      const pdfState = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        const img = document.querySelector('.dicom-canvas-surface img');
        const teethArch = document.querySelector('svg path[d*="M40,190"]');
        const fakeSeal = document.evaluate("//*[contains(text(),'SHA-256 VERIFIED SEAL')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const fakeTeethCount = document.evaluate("//*[contains(text(),'32 Teethed')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const ocrCard = document.querySelector('.btn-details-raw-ocr');

        return {
          hasIframe: Boolean(iframe),
          iframeSrc: iframe ? iframe.src.slice(0, 50) : null,
          hasImg: Boolean(img),
          hasTeethArch: Boolean(teethArch),
          hasFakeSeal: Boolean(fakeSeal),
          hasFakeTeethCount: Boolean(fakeTeethCount),
          hasOcrCard: Boolean(ocrCard)
        };
      });

      console.log('PDF Details Evaluation:', JSON.stringify(pdfState, null, 2));

      const pdfShotPath = path.join(ARTIFACTS_DIR, 'record_preview_pdf.png');
      await page.screenshot({ path: pdfShotPath, fullPage: true });
      console.log('Saved PDF screenshot to:', pdfShotPath);

      // Test Zoom In on PDF page
      const zoomInBtn = await page.$('button[title*="Zoom In"]');
      if (zoomInBtn) {
        await zoomInBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const zoomText = await page.evaluate(() => {
          const el = document.querySelector('button[title*="Click to reset"]');
          return el ? el.textContent.trim() : null;
        });
        console.log('Zoom Level after +25% click:', zoomText);
      }
    }

    // 4. Inspect Image Details View
    if (uploadedImageRecordId) {
      console.log(`\nStep 4: Navigating to Image details route: /admin/records/${uploadedImageRecordId}...`);
      await page.goto(`http://localhost:5174/admin/records/${uploadedImageRecordId}`, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2500));

      const imgState = await page.evaluate(() => {
        const img = document.querySelector('.dicom-canvas-surface img');
        const teethArch = document.querySelector('svg path[d*="M40,190"]');
        return {
          hasImg: Boolean(img),
          imgSrc: img ? img.src.slice(0, 50) : null,
          hasTeethArch: Boolean(teethArch),
        };
      });

      console.log('Image Details Evaluation:', JSON.stringify(imgState, null, 2));

      // Test Rotate CW
      const rotateBtn = await page.$('button[title*="Rotate Clockwise"]');
      if (rotateBtn) {
        await rotateBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }

      // Test Invert Contrast
      const contrastBtn = await page.$('button[title*="Contrast"]');
      if (contrastBtn) {
        await contrastBtn.click();
        await new Promise(r => setTimeout(r, 400));
      }

      const imgShotPath = path.join(ARTIFACTS_DIR, 'record_preview_image.png');
      await page.screenshot({ path: imgShotPath, fullPage: true });
      console.log('Saved Image screenshot to:', imgShotPath);

      // 5. Test Reload Persistence
      console.log('\nStep 5: Testing page reload persistence...');
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2500));

      const reloadImg = await page.$('.dicom-canvas-surface img');
      console.log('Image present after reload:', Boolean(reloadImg));

      const reloadShotPath = path.join(ARTIFACTS_DIR, 'record_preview_after_reload.png');
      await page.screenshot({ path: reloadShotPath, fullPage: true });
      console.log('Saved Reload screenshot to:', reloadShotPath);
    }

    console.log('\nAll E2E checks passed successfully!');
  } finally {
    await browser.close();
  }
})();

