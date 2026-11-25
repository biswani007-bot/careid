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

async function runTest() {
  console.log('--- STARTING EYE BUTTON NAVIGATION TEST ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  // 1. Open /admin/referrals
  console.log('Navigating to /admin/referrals...');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-table tbody tr', { timeout: 10000 });

  // 2. Click Eye icon for #REF-8842
  console.log('\n--- Test Case 1: Clicking Eye icon for #REF-8842 ---');
  const eyeBtn8842 = await page.waitForSelector('button[aria-label="View details for #REF-8842"]', { timeout: 5000 });
  if (!eyeBtn8842) {
    throw new Error('Eye button for #REF-8842 not found!');
  }
  await eyeBtn8842.click();

  // Wait for URL to update to /admin/referrals/REF-8842
  await page.waitForFunction(() => window.location.pathname === '/admin/referrals/REF-8842', { timeout: 5000 });
  console.log('SUCCESS: Browser navigated to:', await page.evaluate(() => window.location.pathname));

  // Verify dedicated page rendered and NO modal is open
  await page.waitForSelector('.referral-patient-name', { timeout: 8000 });
  const pageDetails = await page.evaluate(() => {
    const isModalOpen = document.querySelector('.referral-modal-overlay') !== null || document.querySelector('.referral-modal-container') !== null;
    const heading = document.querySelector('.referral-main-heading')?.textContent?.trim();
    const breadcrumb = document.querySelector('.referral-breadcrumb-current')?.textContent?.trim();
    const patientName = document.querySelector('.referral-patient-name')?.textContent?.trim();
    const referralIdVal = document.querySelector('[data-card="referral-information"] .referral-field-value')?.textContent?.trim();
    const receivingDept = document.querySelectorAll('.referral-field-group.bordered .referral-field-value')[1]?.textContent?.trim();

    return {
      isModalOpen,
      heading,
      breadcrumb,
      patientName,
      referralIdVal,
      receivingDept,
      pathname: window.location.pathname,
    };
  });

  console.log('Rendered Details for #REF-8842:', pageDetails);
  if (pageDetails.isModalOpen) {
    throw new Error('FAILED: Modal is open instead of dedicated page!');
  }
  if (pageDetails.pathname !== '/admin/referrals/REF-8842') {
    throw new Error(`FAILED: Expected URL /admin/referrals/REF-8842, got ${pageDetails.pathname}`);
  }
  if (pageDetails.patientName !== 'Eleanor Jensen') {
    throw new Error(`FAILED: Expected patient Eleanor Jensen, got ${pageDetails.patientName}`);
  }
  console.log('PASSED: Dedicated Referral Details & Timeline page loaded correctly for REF-8842!');

  const shot8842 = path.join(mediaDir, 'referral_details_nav_8842.png');
  await page.screenshot({ path: shot8842 });
  console.log('Saved screenshot to:', shot8842);

  // 3. Test another referral: #REF-9021
  console.log('\n--- Test Case 2: Return to Dashboard and Click Eye icon for #REF-9021 ---');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-table tbody tr', { timeout: 10000 });

  const eyeBtn9021 = await page.waitForSelector('button[aria-label="View details for #REF-9021"]', { timeout: 5000 });
  if (!eyeBtn9021) {
    throw new Error('Eye button for #REF-9021 not found!');
  }
  await eyeBtn9021.click();

  await page.waitForFunction(() => window.location.pathname === '/admin/referrals/REF-9021', { timeout: 5000 });
  console.log('SUCCESS: Browser navigated to:', await page.evaluate(() => window.location.pathname));

  await page.waitForSelector('.referral-patient-name', { timeout: 8000 });
  const details9021 = await page.evaluate(() => {
    const isModalOpen = document.querySelector('.referral-modal-overlay') !== null;
    const heading = document.querySelector('.referral-main-heading')?.textContent?.trim();
    const breadcrumb = document.querySelector('.referral-breadcrumb-current')?.textContent?.trim();
    const patientName = document.querySelector('.referral-patient-name')?.textContent?.trim();
    const referralIdVal = document.querySelector('[data-card="referral-information"] .referral-field-value')?.textContent?.trim();

    return {
      isModalOpen,
      heading,
      breadcrumb,
      patientName,
      referralIdVal,
      pathname: window.location.pathname,
    };
  });

  console.log('Rendered Details for #REF-9021:', details9021);
  if (details9021.isModalOpen) {
    throw new Error('FAILED: Modal is open instead of dedicated page!');
  }
  if (details9021.pathname !== '/admin/referrals/REF-9021') {
    throw new Error(`FAILED: Expected URL /admin/referrals/REF-9021, got ${details9021.pathname}`);
  }
  if (details9021.patientName !== 'John Smith') {
    throw new Error(`FAILED: Expected patient John Smith, got ${details9021.patientName}`);
  }
  console.log('PASSED: Dedicated Referral Details & Timeline page loaded correctly for REF-9021!');

  const shot9021 = path.join(mediaDir, 'referral_details_nav_9021.png');
  await page.screenshot({ path: shot9021 });
  console.log('Saved screenshot to:', shot9021);

  // 4. Test modal action preservation (FileText icon opens clinical notes modal)
  console.log('\n--- Test Case 3: Verify Clinical Notes Modal still opens via FileText button ---');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-table tbody tr', { timeout: 10000 });

  const notesBtn = await page.waitForSelector('button[aria-label="View records for #REF-8842"]', { timeout: 5000 });
  await notesBtn.click();
  await page.waitForSelector('.referral-modal-backdrop', { visible: true, timeout: 5000 });
  const modalTitle = await page.evaluate(() => document.querySelector('.referral-modal-card h3')?.textContent?.trim());
  console.log(`Modal opened successfully with title: "${modalTitle}" (URL stayed ${await page.evaluate(() => window.location.pathname)})`);

  const modalShot = path.join(mediaDir, 'referral_dashboard_notes_modal_preserved.png');
  await page.screenshot({ path: modalShot });
  console.log('Saved modal screenshot to:', modalShot);

  await browser.close();
  console.log('\n--- ALL EYE BUTTON NAVIGATION TESTS PASSED! ---');
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
