const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const mediaDir = path.join(
  'C:',
  'Users',
  'biswa',
  '.gemini',
  'antigravity-ide',
  'brain',
  'e0785a94-53fe-4f28-b816-f2efe4edf49e',
  '.tempmediaStorage'
);

if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

async function runVerification() {
  console.log('--- STARTING REFERRAL DETAILS & TIMELINE VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  const viewports = [
    { name: 'desktop_1280', width: 1280, height: 1024, shot: 'referral_details_desktop_1280.png' },
    { name: 'laptop_1366', width: 1366, height: 768, shot: 'referral_details_laptop_1366.png' },
    { name: 'smalldesktop_1024', width: 1024, height: 768, shot: 'referral_details_smalldesktop_1024.png' },
    { name: 'mobile_375', width: 375, height: 812, shot: 'referral_details_mobile_375.png' },
  ];

  for (const vp of viewports) {
    console.log(`\nTesting viewport ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/referrals/ref-9021', { waitUntil: 'networkidle2' });

    // Wait for content canvas
    await page.waitForSelector('.referral-details-canvas', { timeout: 10000 });

    const overflowCheck = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return {
        scrollWidth,
        innerWidth,
        hasHorizontalOverflow: scrollWidth > innerWidth,
      };
    });

    console.log(`Viewport ${vp.name} overflow check:`, overflowCheck);
    if (overflowCheck.hasHorizontalOverflow) {
      console.error(`FAILED: Horizontal overflow detected on ${vp.name}!`);
    } else {
      console.log(`PASSED: Zero horizontal overflow on ${vp.name}`);
    }

    const shotPath = path.join(mediaDir, vp.shot);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot to ${shotPath}`);
  }

  // Set back to desktop for functional interactions
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('http://localhost:5173/admin/referrals/ref-9021', { waitUntil: 'networkidle2' });

  // 1. Verify Elements on the page
  console.log('\n--- Verifying Core Elements ---');
  const detailsData = await page.evaluate(() => {
    const heading = document.querySelector('.referral-main-heading')?.textContent?.trim();
    const statusPill = document.querySelector('.referral-status-pill')?.textContent?.trim();
    const referralIdVal = document.querySelector('[data-card="referral-information"] .referral-field-value')?.textContent?.trim();
    const patientName = document.querySelector('.referral-patient-name')?.textContent?.trim();
    const doctorVal = document.querySelector('.referral-field-group.bordered .referral-field-value')?.textContent?.trim();
    const reasonText = document.querySelector('.referral-reason-box')?.textContent?.trim();
    const attachmentCount = document.querySelectorAll('.referral-attachment-item').length;
    const notesCount = document.querySelectorAll('.referral-note-bubble').length;
    const timelineItems = document.querySelectorAll('.referral-timeline-item').length;

    return {
      heading,
      statusPill,
      referralIdVal,
      patientName,
      doctorVal,
      reasonText: reasonText ? reasonText.slice(0, 40) + '...' : null,
      attachmentCount,
      notesCount,
      timelineItems,
    };
  });
  console.log('Page elements verified:', detailsData);

  // 2. Test Add Operational Note Dialog
  console.log('\n--- Testing Add Operational Note Modal ---');
  await page.click('#btn-add-operational-note');
  await page.waitForSelector('.referral-modal-container', { visible: true });
  await new Promise((r) => setTimeout(r, 200));
  const noteModalShot = path.join(mediaDir, 'referral_details_add_note_modal.png');
  await page.screenshot({ path: noteModalShot });
  console.log('Saved note modal screenshot to:', noteModalShot);

  // Type note and submit
  await page.type('#noteText', 'Coordination call completed with Dr. Jenkins. Cardiology team confirmed slot for Thursday.');
  await page.click('#btn-submit-note');
  await page.waitForFunction(() => !document.querySelector('.referral-modal-container'), { timeout: 5000 });
  console.log('Submitted operational note successfully!');

  // Verify note was added
  const notesCountAfter = await page.evaluate(() => document.querySelectorAll('.referral-note-bubble').length);
  console.log(`Notes count after addition: ${notesCountAfter} (was ${detailsData.notesCount})`);

  // 3. Test Attachment Preview Modal
  console.log('\n--- Testing Attachment Preview Modal ---');
  const firstAttachmentBtn = await page.$('.referral-attachment-btn');
  if (firstAttachmentBtn) {
    await firstAttachmentBtn.click();
    await page.waitForSelector('.referral-modal-container', { visible: true });
    await new Promise((r) => setTimeout(r, 200));
    const previewShot = path.join(mediaDir, 'referral_details_attachment_preview.png');
    await page.screenshot({ path: previewShot });
    console.log('Saved attachment preview screenshot to:', previewShot);

    // Close preview
    await page.click('.referral-modal-close-btn');
    await page.waitForFunction(() => !document.querySelector('.referral-modal-container'), { timeout: 5000 });
  }

  // 4. Test View Patient Profile Navigation
  console.log('\n--- Testing View Patient Profile Navigation ---');
  await page.click('#btn-view-patient-profile');
  await page.waitForFunction(() => window.location.pathname.includes('/admin/patients/'), { timeout: 5000 });
  console.log('Successfully navigated to patient profile:', await page.evaluate(() => window.location.pathname));

  // 5. Test Navigation from Dashboard to Details
  console.log('\n--- Testing Dashboard -> Details Navigation ---');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-cell-id button', { timeout: 5000 });
  await page.click('.referral-cell-id button');
  await page.waitForFunction(() => window.location.pathname.startsWith('/admin/referrals/'), { timeout: 5000 });
  console.log('Successfully navigated from dashboard row to details:', await page.evaluate(() => window.location.pathname));

  await browser.close();
  console.log('\n--- ALL REFERRAL DETAILS TESTS COMPLETED SUCCESSFULLY ---');
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
