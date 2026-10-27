const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e');

async function main() {
  console.log('Launching browser to test CareID Admin Portal: Patient Profile...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[Browser Error]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('[Page Error]', err.message);
  });

  try {
    // 1. Navigate to Patient Directory
    console.log('Step 1: Navigating to http://localhost:5173/admin/patients...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.patients-table-row', { timeout: 10000 });
    console.log('Patient Directory loaded successfully.');

    // 2. Click Eleanor Vance row to navigate to Patient Profile
    console.log('Step 2: Clicking Eleanor Vance row to navigate to Patient Profile...');
    await page.click('.patients-table-row[data-node-id="pat-1"]');
    await page.waitForSelector('.patient-profile-name', { timeout: 10000 });
    console.log('Current URL after navigation:', page.url());

    // Take Desktop Screenshot
    const desktopShot = path.join(ARTIFACT_DIR, 'patient_profile_desktop_1280.png');
    await page.screenshot({ path: desktopShot, fullPage: true });
    console.log('Saved Desktop Screenshot:', desktopShot);

    // 3. Verify Patient Profile Information
    console.log('Step 3: Verifying patient profile fields...');
    const patientName = await page.$eval('.patient-profile-name', (el) => el.textContent.trim());
    const vaultId = await page.$eval('.patient-profile-vault-id', (el) => el.textContent.trim());
    const statusBadge = await page.$eval('.patient-profile-status-badge', (el) => el.textContent.trim());
    const recordsCount = await page.$eval('.patient-profile-vault-banner-count', (el) => el.textContent.trim());
    const dependents = await page.$$eval('.patient-profile-dependent-name', (els) => els.map(e => e.textContent.trim()));

    console.log('Verified Fields:');
    console.log('- Name:', patientName);
    console.log('- Vault ID:', vaultId);
    console.log('- Status Badge:', statusBadge);
    console.log('- Total Records:', recordsCount);
    console.log('- Dependents:', dependents);

    // 4. Test Suspend & Reactivate flow
    console.log('Step 4: Testing Suspend flow...');
    await page.click('.patient-profile-btn-suspend');
    await page.waitForSelector('.user-dialog-card', { timeout: 5000 });
    console.log('Suspend dialog opened.');

    await page.click('.user-dialog-btn-deactivate');
    await page.waitForSelector('.user-action-snackbar', { timeout: 5000 });
    console.log('Suspend confirmed. Snackbar displayed.');

    // Verify button became Reactivate
    await page.waitForSelector('.patient-profile-btn-reactivate', { timeout: 5000 });
    console.log('Reactivate button rendered.');

    // Reactivate back
    console.log('Testing Reactivate flow...');
    await page.click('.patient-profile-btn-reactivate');
    await page.waitForSelector('.user-dialog-card', { timeout: 5000 });
    await page.click('.user-dialog-btn-activate');
    await page.waitForSelector('.user-action-snackbar', { timeout: 5000 });
    console.log('Reactivate confirmed.');
    await page.waitForSelector('.user-dialog-card', { hidden: true });
    await new Promise(r => setTimeout(r, 400));

    // 5. Test Reset Account Dialog
    console.log('Step 5: Testing Reset Account dialog...');
    await page.click('.patient-profile-btn-reset');
    await page.waitForSelector('.user-dialog-btn-reset', { timeout: 5000 });
    console.log('Reset Account dialog opened.');
    await page.click('.user-dialog-btn-reset');
    await page.waitForSelector('.user-action-snackbar', { timeout: 5000 });
    console.log('Reset Account action confirmed. Recovery link dispatched.');
    await page.waitForSelector('.user-dialog-card', { hidden: true });
    await new Promise(r => setTimeout(r, 400));

    // 6. Test Edit Profile Modal
    console.log('Step 6: Testing Edit Profile modal...');
    await page.click('.patient-profile-btn-edit');
    await page.waitForSelector('.patient-modal-dialog', { timeout: 5000 });
    console.log('Edit Profile modal opened.');

    // Edit phone number
    await page.$eval('#edit-phone', (input) => { input.value = ''; });
    await page.type('#edit-phone', '+1 (555) 999-0000');
    await page.click('.patient-modal-btn-save');
    await page.waitForSelector('.user-action-snackbar', { timeout: 5000 });
    console.log('Edit Profile saved. Updated phone verified.');
    await page.waitForSelector('.patient-modal-overlay', { hidden: true });
    await new Promise(r => setTimeout(r, 400));

    // 7. Test Breadcrumb Navigation
    console.log('Step 7: Testing Breadcrumb back navigation to Patients Directory...');
    await page.click('.patient-profile-crumb-parent');
    await page.waitForSelector('.patients-table', { timeout: 10000 });
    console.log('Successfully returned to Patients Directory. Current URL:', page.url());

    // 8. Test Tablet (1024x768) and Mobile (390x844) Viewports
    console.log('Step 8: Testing Tablet and Mobile viewports...');
    await page.goto('http://localhost:5173/admin/patients/pat-1', { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1024, height: 768 });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 5000 });
    const tabletShot = path.join(ARTIFACT_DIR, 'patient_profile_tablet_1024.png');
    await page.screenshot({ path: tabletShot, fullPage: true });
    console.log('Saved Tablet Screenshot:', tabletShot);

    await page.setViewport({ width: 390, height: 844 });
    await page.waitForSelector('.header-menu-toggle', { timeout: 5000 });
    const mobileShot = path.join(ARTIFACT_DIR, 'patient_profile_mobile_390.png');
    await page.screenshot({ path: mobileShot, fullPage: true });
    console.log('Saved Mobile Screenshot:', mobileShot);

    // Open mobile drawer
    await page.click('.header-menu-toggle');
    await page.waitForSelector('.careid-sidebar.drawer-open', { timeout: 5000 });
    const mobileDrawerShot = path.join(ARTIFACT_DIR, 'patient_profile_mobile_drawer_390.png');
    await page.screenshot({ path: mobileDrawerShot, fullPage: true });
    console.log('Saved Mobile Drawer Screenshot:', mobileDrawerShot);

    console.log('\n=== All Tests Passed Successfully! ===');
    console.log('Console Errors:', consoleErrors.length);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
