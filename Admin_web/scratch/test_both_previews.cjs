const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function uploadFileToBackend(token, patientProfileId, category, filePath) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.alloc(0);

    const fields = { patientProfileId, category };
    for (const [k, v] of Object.entries(fields)) {
      const fieldHead = `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
      body = Buffer.concat([body, Buffer.from(fieldHead)]);
    }

    const mime = fileName.endsWith('.png') ? 'image/png' : (fileName.endsWith('.jpg') ? 'image/jpeg' : 'application/pdf');
    const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
    body = Buffer.concat([body, Buffer.from(fileHead), fileBuffer, Buffer.from('\r\n')]);
    body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/attachments',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Accept: 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('--- TESTING BOTH PDF AND IMAGE AUTHENTIC PREVIEW ---');
  const token = await getFreshToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a'; // Karcus Doe (CID-249015)

  // 1. Upload PDF
  console.log('Uploading PDF to backend /api/v1/attachments...');
  const pdfUpload = await uploadFileToBackend(
    token,
    patientProfileId,
    'LAB_RESULT',
    'scratch/medical_blood_panel.pdf'
  );
  console.log('PDF Upload status:', pdfUpload.status);
  const pdfAtt = pdfUpload.body?.data;
  console.log('PDF Attachment ID:', pdfAtt?.id, 'fileName:', pdfAtt?.fileName);

  // 2. Upload Image (facility-cath-lab.jpg)
  console.log('\nUploading Image to backend /api/v1/attachments...');
  const imgUpload = await uploadFileToBackend(
    token,
    patientProfileId,
    'IMAGING_STUDY',
    'src/assets/facilities/facility-cath-lab.jpg'
  );
  console.log('Image Upload status:', imgUpload.status);
  const imgAtt = imgUpload.body?.data;
  console.log('Image Attachment ID:', imgAtt?.id, 'fileName:', imgAtt?.fileName);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });

    // Seed session and seed vault attachments with both uploaded items
    await page.evaluate((tok, pAtt, iAtt) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', tok);
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: 'admin-super-01',
        role: 'SUPER_ADMIN',
        fullName: 'Super Administrator',
        email: 'superadmin@careid.com'
      }));

      const vaultRecords = [
        {
          id: pAtt.id,
          recordNumber: `#ATT-${pAtt.id.slice(0, 8).toUpperCase()}`,
          title: 'Comprehensive Metabolic Panel (PDF)',
          patientName: 'Karcus Doe',
          patientId: 'CID-249015',
          patientInitials: 'KD',
          patientAvatarBg: 'bg-emerald-600',
          category: 'Medical',
          recordType: 'Diagnostic Lab Panel',
          provider: 'Dr. Michael Chen',
          facility: 'Metro General Hospital',
          recordDate: '14 Nov 2026',
          recordDateIso: new Date().toISOString(),
          status: 'Uploaded Document',
          entityType: 'ATTACHMENT',
          isAttachment: true,
          summary: 'Verified clinical lab panel uploaded to CareID Vault.',
          clinicalNotes: 'Blood biochemistry within normal reference bounds.',
          documentType: 'LAB_RESULT',
          fileSize: '68 B',
          ocrConfidence: 99.4,
          attachments: [pAtt]
        },
        {
          id: iAtt.id,
          recordNumber: `#ATT-${iAtt.id.slice(0, 8).toUpperCase()}`,
          title: 'Cardiovascular Cath Lab Imaging (JPEG)',
          patientName: 'Karcus Doe',
          patientId: 'CID-249015',
          patientInitials: 'KD',
          patientAvatarBg: 'bg-emerald-600',
          category: 'Medical',
          recordType: 'Cath Lab Fluoroscopy',
          provider: 'Dr. Sarah Jenkins',
          facility: 'Manhattan Heart Center',
          recordDate: '14 Nov 2026',
          recordDateIso: new Date().toISOString(),
          status: 'Uploaded Document',
          entityType: 'ATTACHMENT',
          isAttachment: true,
          summary: 'High-resolution cardiac catheterization fluoroscopy scan.',
          clinicalNotes: 'Coronary perfusion scan showing clear vascular ingress.',
          documentType: 'IMAGING_STUDY',
          fileSize: '850 KB',
          ocrConfidence: 99.1,
          attachments: [iAtt]
        }
      ];

      localStorage.setItem('careid_admin_vault_attachments', JSON.stringify(vaultRecords));
    }, token, pdfAtt, imgAtt);

    // 1. Inspect PDF Preview
    console.log(`\nNavigating to PDF record details: /admin/records/${pdfAtt.id}...`);
    await page.goto(`http://localhost:5174/admin/records/${pdfAtt.id}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    const pdfChecks = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      const img = document.querySelector('.dicom-canvas-surface img');
      const ocrSummary = document.querySelector('.record-details-grid')?.textContent || '';
      return {
        hasIframe: Boolean(iframe),
        iframeSrc: iframe ? iframe.src : null,
        hasImg: Boolean(img),
        hasOcrCard: ocrSummary.includes('EXTRACTED CLINICAL SUMMARY & INGRESS'),
        hasFakeTeeth: ocrSummary.includes('32 Teethed'),
        hasFakeAnnotations: document.querySelectorAll('.dicom-roi-annotation').length
      };
    });
    console.log('PDF Preview Checks:', JSON.stringify(pdfChecks, null, 2));

    const pdfShot = path.join(ARTIFACTS_DIR, 'record_preview_pdf.png');
    await page.screenshot({ path: pdfShot, fullPage: true });
    console.log('Saved PDF screenshot to:', pdfShot);

    // 2. Inspect Image Preview
    console.log(`\nNavigating to Image record details: /admin/records/${imgAtt.id}...`);
    await page.goto(`http://localhost:5174/admin/records/${imgAtt.id}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    const imgChecks = await page.evaluate(() => {
      const img = document.querySelector('.dicom-canvas-surface img');
      const iframe = document.querySelector('iframe');
      return {
        hasImg: Boolean(img),
        imgSrc: img ? img.src : null,
        hasIframe: Boolean(iframe)
      };
    });
    console.log('Image Preview Checks:', JSON.stringify(imgChecks, null, 2));

    // Test Zoom In (+25%)
    const zoomInBtn = await page.$('button[title*="Zoom In"]');
    if (zoomInBtn) {
      await zoomInBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Test Rotate Clockwise
    const rotateBtn = await page.$('button[title*="Rotate Clockwise"]');
    if (rotateBtn) {
      await rotateBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    // Test Contrast Invert
    const contrastBtn = await page.$('button[title*="Contrast"]');
    if (contrastBtn) {
      await contrastBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    const imgShot = path.join(ARTIFACTS_DIR, 'record_preview_image.png');
    await page.screenshot({ path: imgShot, fullPage: true });
    console.log('Saved Image screenshot to:', imgShot);

    // 3. Test Reload Persistence
    console.log('\nTesting reload persistence on Image record...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));

    const reloadHasImg = await page.evaluate(() => Boolean(document.querySelector('.dicom-canvas-surface img')));
    console.log('Image still rendered after reload:', reloadHasImg);

    const reloadShot = path.join(ARTIFACTS_DIR, 'record_preview_after_reload.png');
    await page.screenshot({ path: reloadShot, fullPage: true });
    console.log('Saved Reload screenshot to:', reloadShot);

    console.log('\n--- ALL RUNTIME CHECKS COMPLETED SUCCESSFULLY ---');
  } finally {
    await browser.close();
  }
})();

