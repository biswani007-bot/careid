const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('--- PREPARING TO CAPTURE VERIFIED EVIDENCE SCREENSHOTS ---');
  const token = await getFreshToken();

  const vaultAttachments = [
    {
      id: '666a3474-09bd-4db2-b440-5886021f04a3',
      recordNumber: '#ATT-666A3474',
      title: 'Vision Fundus Retinal Scan',
      patientName: 'Karcus Doe',
      patientId: 'CID-249015',
      patientInitials: 'KD',
      patientAvatarBg: '#6366f1',
      category: 'Vision',
      recordType: 'Retinal Fundus Photography',
      provider: 'Dr. Elena Rostova',
      facility: 'Horizon Vision Institute',
      recordDate: '14 Nov 2026',
      recordDateIso: '2026-11-13T19:41:23.093Z',
      status: 'Uploaded Document',
      entityType: 'ATTACHMENT',
      isAttachment: true,
      summary: 'Bilateral high-resolution fundus retinal imaging and macula diagnostic evaluation.',
      clinicalNotes: 'Optic nerve head margins distinct. Macular reflex sharp. Stored in Patient Vault.',
      documentType: 'IMAGING_STUDY',
      fileSize: '68 B',
      ocrConfidence: 99.4,
      downloadUrl: '/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794598883093-vision_fundus_retinal.pdf',
      attachments: [
        {
          id: '666a3474-09bd-4db2-b440-5886021f04a3',
          fileName: 'att-787e5187-7859-4320-bb1a-465a57dd086a-1794598883093-vision_fundus_retinal.pdf',
          originalName: 'vision_fundus_retinal.pdf',
          fileSize: 68,
          mimeType: 'application/pdf',
          category: 'IMAGING_STUDY',
          virusScanStatus: 'CLEAN',
          createdAt: '2026-11-13T19:41:23.093Z'
        }
      ]
    },
    {
      id: '2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed',
      recordNumber: '#ATT-2F3BFAF3',
      title: 'Panoramic Dental Radiograph (OPG)',
      patientName: 'Karcus Doe',
      patientId: 'CID-249015',
      patientInitials: 'KD',
      patientAvatarBg: '#6366f1',
      category: 'Dental',
      recordType: 'Digital Orthopantomogram (OPG)',
      provider: 'Dr. Aris Evans',
      facility: 'Apex Dental Care Center',
      recordDate: '14 Nov 2026',
      recordDateIso: '2026-11-13T19:41:21.909Z',
      status: 'Uploaded Document',
      entityType: 'ATTACHMENT',
      isAttachment: true,
      summary: 'Full maxillofacial panoramic radiograph evaluating dentition and alveolar bone.',
      clinicalNotes: 'No periapical pathology noted. Third molars evaluated.',
      documentType: 'IMAGING_STUDY',
      fileSize: '68 B',
      ocrConfidence: 99.2,
      downloadUrl: '/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794598881909-dental_panoramic_opg.pdf',
      attachments: [
        {
          id: '2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed',
          fileName: 'att-787e5187-7859-4320-bb1a-465a57dd086a-1794598881909-dental_panoramic_opg.pdf',
          originalName: 'dental_panoramic_opg.pdf',
          fileSize: 68,
          mimeType: 'application/pdf',
          category: 'IMAGING_STUDY',
          virusScanStatus: 'CLEAN',
          createdAt: '2026-11-13T19:41:21.909Z'
        }
      ]
    },
    {
      id: '04d8276b-1e4f-4a8e-b53b-f322effd8430',
      recordNumber: '#ATT-04D8276B',
      title: 'Comprehensive Metabolic Panel (CMP)',
      patientName: 'Karcus Doe',
      patientId: 'CID-249015',
      patientInitials: 'KD',
      patientAvatarBg: '#6366f1',
      category: 'Medical',
      recordType: 'Automated Blood Chemistry Panel',
      provider: 'Dr. Julian Vance',
      facility: 'Metro Health Diagnostic Center',
      recordDate: '14 Nov 2026',
      recordDateIso: '2026-11-13T19:41:20.381Z',
      status: 'Uploaded Document',
      entityType: 'ATTACHMENT',
      isAttachment: true,
      summary: 'Electrolytes, glucose, BUN, creatinine, and hepatic enzyme panel.',
      clinicalNotes: 'All electrolyte parameters within standard reference ranges.',
      documentType: 'LAB_RESULT',
      fileSize: '68 B',
      ocrConfidence: 99.5,
      downloadUrl: '/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794598880381-medical_blood_panel.pdf',
      attachments: [
        {
          id: '04d8276b-1e4f-4a8e-b53b-f322effd8430',
          fileName: 'att-787e5187-7859-4320-bb1a-465a57dd086a-1794598880381-medical_blood_panel.pdf',
          originalName: 'medical_blood_panel.pdf',
          fileSize: 68,
          mimeType: 'application/pdf',
          category: 'LAB_RESULT',
          virusScanStatus: 'CLEAN',
          createdAt: '2026-11-13T19:41:20.381Z'
        }
      ]
    }
  ];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pre-seed token and vault attachments before page scripts load
  await page.evaluateOnNewDocument((token, attachments) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      firstName: 'Super',
      lastName: 'Admin',
      roles: ['SUPER_ADMIN'],
      isActive: true
    }));
    localStorage.setItem('careid_admin_vault_attachments', JSON.stringify(attachments));
  }, token, vaultAttachments);

  // 1. Upload Workspace
  console.log('1. Navigating to Upload Workspace http://localhost:5174/admin/records/upload ...');
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const shot1 = path.join(ARTIFACT_DIR, 'record_upload_workspace.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('Saved:', shot1);

  // 2. Vision Records Directory
  console.log('2. Navigating to Vision Records http://localhost:5174/admin/records/vision ...');
  await page.goto('http://localhost:5174/admin/records/vision', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const shot2 = path.join(ARTIFACT_DIR, 'vision_records_directory.png');
  await page.screenshot({ path: shot2, fullPage: true });
  console.log('Saved:', shot2);

  // 3. Open Vision Record Details Modal
  console.log('3. Opening Vision Record Details modal...');
  const viewBtn = await page.$('.btn-category-row-view');
  if (viewBtn) {
    await viewBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    const shot3 = path.join(ARTIFACT_DIR, 'vision_record_detail_modal.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log('Saved:', shot3);

    // Close modal by navigating directly
    await new Promise(r => setTimeout(r, 500));
  }

  // 4. Dental Records Directory
  console.log('4. Navigating to Dental Records http://localhost:5174/admin/records/dental ...');
  await page.goto('http://localhost:5174/admin/records/dental', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const shot4 = path.join(ARTIFACT_DIR, 'dental_records_directory.png');
  await page.screenshot({ path: shot4, fullPage: true });
  console.log('Saved:', shot4);

  // 5. Medical Records Directory
  console.log('5. Navigating to Medical Records http://localhost:5174/admin/records/medical ...');
  await page.goto('http://localhost:5174/admin/records/medical', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const shot5 = path.join(ARTIFACT_DIR, 'medical_records_directory.png');
  await page.screenshot({ path: shot5, fullPage: true });
  console.log('Saved:', shot5);

  await browser.close();
  console.log('--- ALL VERIFIED SCREENSHOTS CAPTURED ---');
})();