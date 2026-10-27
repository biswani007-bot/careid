const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('--- STARTING USER DETAILS TEST ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // 1. Start at User Directory
    console.log('1. Navigating to /admin/users...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });

    // Wait for table rows to appear
    await page.waitForSelector('.users-table-row', { timeout: 5000 });
    console.log('User directory loaded successfully.');

    // 2. Click Sarah Jenkins row to navigate to User Details
    console.log('2. Clicking Sarah Jenkins row to navigate to details...');
    const firstRow = await page.$('.users-table-row');
    await firstRow.click();

    // Wait for User Details elements
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });
    const currentUrl = page.url();
    console.log('Current URL after row click:', currentUrl);

    // Verify Title and Breadcrumbs
    const pageTitle = await page.$eval('.user-details-heading', el => el.textContent.trim());
    const breadcrumbs = await page.$eval('.user-details-breadcrumbs', el => el.textContent.trim());
    console.log(`Page title: "${pageTitle}"`);
    console.log(`Breadcrumbs: "${breadcrumbs}"`);

    // Verify Profile Card Info
    const profileName = await page.$eval('.profile-card-name', el => el.textContent.trim());
    const profileRole = await page.$eval('.profile-card-role', el => el.textContent.trim());
    const profileStatus = await page.$eval('.profile-card-status-badge', el => el.textContent.trim());
    const profileHvid = await page.$eval('.profile-card-hvid-val', el => el.textContent.trim());
    console.log(`Profile Name: "${profileName}"`);
    console.log(`Profile Role: "${profileRole}"`);
    console.log(`Profile Status: "${profileStatus}"`);
    console.log(`Profile HV-ID: "${profileHvid}"`);

    // Verify Account Information
    const accountInfoTitle = await page.$eval('.user-details-card-title', el => el.textContent.trim());
    console.log(`Card 1 Title: "${accountInfoTitle}"`);

    // Capture Desktop Screenshot
    const desktopScreenshot = path.join(ARTIFACT_DIR, 'user_details_desktop_1280x1024.png');
    await page.screenshot({ path: desktopScreenshot });
    console.log('Saved desktop screenshot:', desktopScreenshot);

    // 3. Test Reset Password Modal
    console.log('3. Testing Reset Password dialog...');
    await page.click('.btn-details-reset');
    await page.waitForSelector('#reset-modal-title');
    console.log('Reset modal opened.');
    // Click confirm reset
    const confirmResetBtn = await page.$('.btn-modal-submit');
    if (confirmResetBtn) await confirmResetBtn.click();
    await page.waitForSelector('.user-details-toast', { timeout: 3000 });
    const resetToastText = await page.$eval('.user-details-toast', el => el.textContent.trim());
    console.log(`Reset toast appeared: "${resetToastText}"`);

    // Dismiss toast
    const dismissBtn = await page.$('.user-details-toast button');
    if (dismissBtn) await dismissBtn.click();

    // 4. Test Suspend / Reactivate
    console.log('4. Testing Suspend dialog...');
    await page.click('.btn-details-suspend');
    await page.waitForSelector('#suspend-modal-title');
    console.log('Suspend modal opened.');
    const confirmSuspendBtn = await page.$('.btn-modal-danger');
    if (confirmSuspendBtn) await confirmSuspendBtn.click();
    await page.waitForSelector('.btn-details-reactivate', { timeout: 3000 });
    const reactivateBtnText = await page.$eval('.btn-details-reactivate', el => el.textContent.trim());
    console.log(`Button updated to: "${reactivateBtnText}"`);

    // Toggle back to active
    await page.click('.btn-details-reactivate');
    await page.waitForSelector('#suspend-modal-title');
    const confirmReactivateBtn = await page.$('.btn-modal-success');
    if (confirmReactivateBtn) await confirmReactivateBtn.click();
    await page.waitForSelector('.btn-details-suspend', { timeout: 3000 });
    console.log('Reactivated successfully. Button restored to Suspend.');

    // 5. Test Edit Profile Modal
    console.log('5. Testing Edit Profile dialog...');
    await page.click('.btn-details-edit');
    await page.waitForSelector('#edit-profile-title');

    // Capture modal screenshot
    const modalScreenshot = path.join(ARTIFACT_DIR, 'user_details_edit_modal.png');
    await page.screenshot({ path: modalScreenshot });
    console.log('Saved edit modal screenshot:', modalScreenshot);

    // Close edit modal
    const closeEditBtn = await page.$('.user-details-modal-close');
    if (closeEditBtn) await closeEditBtn.click();

    // 6. Test Tablet Viewport
    console.log('6. Testing Tablet Viewport (1024x768)...');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 500));
    const tabletScreenshot = path.join(ARTIFACT_DIR, 'user_details_tablet_1024x768.png');
    await page.screenshot({ path: tabletScreenshot });
    console.log('Saved tablet screenshot:', tabletScreenshot);

    // 7. Test Mobile Viewport
    console.log('7. Testing Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 500));
    const mobileScreenshot = path.join(ARTIFACT_DIR, 'user_details_mobile_390x844.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log('Saved mobile screenshot:', mobileScreenshot);

    // 8. Test Breadcrumb Back Navigation
    console.log('8. Testing Breadcrumb back navigation to /admin/users...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.click('.user-details-breadcrumb-link');
    await page.waitForSelector('.users-table-row', { timeout: 5000 });
    console.log('Navigated back to User Directory successfully! URL:', page.url());

    // 9. Test Direct URL Access and Refresh
    console.log('9. Testing Direct URL /admin/users/user-1 with browser refresh...');
    await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });
    console.log('Direct navigation & refresh verified successfully!');

    console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test encountered error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
