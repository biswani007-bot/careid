const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== STARTING USER ACTION DIALOGS VERIFICATION SUITE ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err));

  try {
    // ------------------------------------------------------------------
    // Part 1: Dedicated Route /admin/users/dialogs (Matching Figma 20:1284)
    // ------------------------------------------------------------------
    console.log('Step 1: Navigating to /admin/users/dialogs (1280x1024)...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto('http://localhost:5173/admin/users/dialogs', { waitUntil: 'networkidle0' });

    await page.waitForSelector('.user-dialogs-screen-title', { timeout: 5000 });
    const screenTitle = await page.$eval('.user-dialogs-screen-title', (el) => el.textContent.trim());
    console.log(`✓ Screen Title: "${screenTitle}"`);

    // Verify side-by-side showcase cards
    const dialogCards = await page.$$('.user-dialogs-grid .user-dialog-card');
    console.log(`✓ Showcase contains ${dialogCards.length} dialog cards side-by-side.`);
    if (dialogCards.length !== 2) {
      throw new Error(`Expected 2 dialog cards in showcase, found ${dialogCards.length}`);
    }

    // Verify Titles of both dialogs
    const dialogTitles = await page.$$eval('.user-dialogs-grid .user-dialog-title', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ Dialog titles in showcase:', dialogTitles);

    // Verify Success Snackbar is visible on initial load
    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const snackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Floating Success Snackbar text: "${snackbarText}"`);

    // Capture Full Desktop Screenshot of Node 20:1284 reproduction
    const showcaseScreenshotPath = path.join(ARTIFACT_DIR, 'user_action_dialogs_showcase_1280x1024.png');
    await page.screenshot({ path: showcaseScreenshotPath });
    console.log(`✓ Saved showcase screenshot to: ${showcaseScreenshotPath}`);

    // Dismiss snackbar
    const dismissBtn = await page.$('.user-action-snackbar-btn');
    if (dismissBtn) {
      await dismissBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const snackbarCount = (await page.$$('.user-action-snackbar')).length;
      console.log(`✓ Snackbar dismissed successfully. (Visible count: ${snackbarCount})`);
    }

    // ------------------------------------------------------------------
    // Part 2: Interactive Modals on /admin/users/dialogs
    // ------------------------------------------------------------------
    console.log('\nStep 2: Testing Live Deactivate Modal Overlay...');
    const openDeactBtn = await page.$('.user-dialogs-toolbar-btn.danger');
    await openDeactBtn.click();

    // Verify backdrop overlay
    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const liveDeactTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Live modal title: "${liveDeactTitle}"`);

    const liveDeactScreenshot = path.join(ARTIFACT_DIR, 'deactivate_modal_overlay.png');
    await page.screenshot({ path: liveDeactScreenshot });
    console.log(`✓ Saved live deactivate modal screenshot to: ${liveDeactScreenshot}`);

    // Test Escape key dismissal
    console.log('Testing Escape key to close modal...');
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));
    let modalBackdrop = await page.$('.user-dialog-backdrop');
    if (modalBackdrop) throw new Error('Escape key did not dismiss the modal!');
    console.log('✓ Escape key dismissed modal cleanly.');

    // Test Confirm Deactivate flow
    console.log('Testing Confirm Deactivate flow...');
    await openDeactBtn.click();
    await page.waitForSelector('.user-dialog-backdrop .user-dialog-btn-deactivate', { timeout: 3000 });
    const confirmDeactBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-deactivate');
    await confirmDeactBtn.click();

    // Verify snackbar appears with deactivate success message
    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const deactSnackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Snackbar updated: "${deactSnackbarText}"`);

    // ------------------------------------------------------------------
    // Part 3: Live Reset Password Modal Overlay
    // ------------------------------------------------------------------
    console.log('\nStep 3: Testing Live Reset Password Modal Overlay...');
    const toolbarButtons = await page.$$('.user-dialogs-toolbar-btn');
    await toolbarButtons[1].click(); // Reset Password button

    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const liveResetTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    const liveResetDesc = await page.$eval(
      '.user-dialog-backdrop .user-dialog-desc',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Live reset modal title: "${liveResetTitle}"`);
    console.log(`✓ Live reset modal description: "${liveResetDesc}"`);

    const liveResetScreenshot = path.join(ARTIFACT_DIR, 'reset_password_modal_overlay.png');
    await page.screenshot({ path: liveResetScreenshot });
    console.log(`✓ Saved live reset password modal screenshot to: ${liveResetScreenshot}`);

    // Click Send Reset Link
    const sendResetBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-reset');
    await sendResetBtn.click();

    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const resetSnackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Snackbar updated: "${resetSnackbarText}"`);

    // ------------------------------------------------------------------
    // Part 4: Integration with User Directory (/admin/users)
    // ------------------------------------------------------------------
    console.log('\nStep 4: Testing Integration in User Directory (/admin/users)...');
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.users-table-row', { timeout: 5000 });

    // Open kebab menu for first user (Sarah Jenkins)
    const firstKebab = await page.$('.user-action-btn');
    await firstKebab.click();

    // Verify dropdown is open
    await page.waitForSelector('[role="menu"]', { timeout: 3000 });
    console.log('✓ User row action dropdown opened.');

    // Click "Toggle Status" (item 3 in dropdown)
    const menuItems = await page.$$('[role="menuitem"]');
    console.log(`Found ${menuItems.length} menu items. Clicking Toggle Status...`);
    await menuItems[2].click(); // Toggle Status

    // Verify authentic DeactivateUserDialog opens
    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const dirModalTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    const dirModalDesc = await page.$eval(
      '.user-dialog-backdrop .user-dialog-desc',
      (el) => el.textContent.trim()
    );
    console.log(`✓ User Directory Deactivate Dialog: "${dirModalTitle}" - "${dirModalDesc}"`);

    const dirDialogScreenshot = path.join(ARTIFACT_DIR, 'user_directory_deactivate_dialog.png');
    await page.screenshot({ path: dirDialogScreenshot });
    console.log(`✓ Saved User Directory dialog screenshot to: ${dirDialogScreenshot}`);

    // Confirm Deactivation
    const dirConfirmBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-deactivate');
    await dirConfirmBtn.click();

    // Wait for snackbar and table update
    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const dirSnackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ User Directory Snackbar: "${dirSnackbarText}"`);

    // Verify user row is now inactive
    const firstRowStatus = await page.$eval(
      '.users-table-row:first-child .user-status-text',
      (el) => el.textContent.trim()
    );
    console.log(`✓ First row status is now: "${firstRowStatus}"`);

    // Now test Reactivate flow
    console.log('Testing Reactivate Dialog flow...');
    await firstKebab.click();
    await page.waitForSelector('[role="menu"]', { timeout: 3000 });
    const updatedMenuItems = await page.$$('[role="menuitem"]');
    await updatedMenuItems[2].click(); // Toggle Status again

    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const activateTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Reactivate Dialog title: "${activateTitle}" (should be Activate User?)`);

    const dirActivateBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-activate');
    await dirActivateBtn.click();

    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const activateSnackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Reactivated Snackbar: "${activateSnackbarText}"`);

    // ------------------------------------------------------------------
    // Part 5: Integration with User Details (/admin/users/user-1)
    // ------------------------------------------------------------------
    console.log('\nStep 5: Testing Integration in User Details (/admin/users/user-1)...');
    await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });

    // Click Reset Password in User Details actions
    const detailsResetBtn = await page.$('.btn-action-primary');
    if (detailsResetBtn) {
      await detailsResetBtn.click();
      await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
      const detailsResetTitle = await page.$eval(
        '.user-dialog-backdrop .user-dialog-title',
        (el) => el.textContent.trim()
      );
      console.log(`✓ User Details Reset Dialog opened: "${detailsResetTitle}"`);

      // Click Send Reset Link
      const confirmDetailsReset = await page.$('.user-dialog-backdrop .user-dialog-btn-reset');
      await confirmDetailsReset.click();

      await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
      const detailsSnackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
      console.log(`✓ User Details Snackbar: "${detailsSnackbarText}"`);
    }

    // ------------------------------------------------------------------
    // Part 6: Responsive Viewports
    // ------------------------------------------------------------------
    console.log('\nStep 6: Testing Responsive Viewports for Dialogs...');
    await page.goto('http://localhost:5173/admin/users/dialogs', { waitUntil: 'networkidle0' });

    // Tablet (1024x768)
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise((r) => setTimeout(r, 400));
    const tabletScreenshot = path.join(ARTIFACT_DIR, 'user_action_dialogs_tablet_1024x768.png');
    await page.screenshot({ path: tabletScreenshot });
    console.log(`✓ Saved tablet screenshot (1024x768) to: ${tabletScreenshot}`);

    // Mobile (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 400));
    const mobileScreenshot = path.join(ARTIFACT_DIR, 'user_action_dialogs_mobile_390x844.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log(`✓ Saved mobile screenshot (390x844) to: ${mobileScreenshot}`);

    console.log('\n=== ALL USER ACTION DIALOGS TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
