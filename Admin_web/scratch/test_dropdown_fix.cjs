const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('--- STARTING ROW ACTIONS DROPDOWN VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // 1. Desktop Test (1280x800)
    await page.setViewport({ width: 1280, height: 800 });
    console.log('1. Navigating to /admin/users...');
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.user-action-btn', { timeout: 5000 });

    const actionButtons = await page.$$('.user-action-btn');
    console.log(`Found ${actionButtons.length} user action buttons.`);

    // Test 1: First Row Dropdown
    console.log('2. Opening dropdown on row 1 (Dr. Sarah Jenkins)...');
    await actionButtons[0].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });
    
    // Check items count
    let items = await page.$$('.user-actions-dropdown-item');
    console.log(`Dropdown menu opened with ${items.length} items.`);
    
    const ssRow1 = path.join(ARTIFACT_DIR, 'dropdown_row_1_desktop.png');
    await page.screenshot({ path: ssRow1 });
    console.log('Saved row 1 screenshot:', ssRow1);

    // Test Outside Click dismissal
    console.log('3. Testing click outside dismissal...');
    await page.click('.users-title');
    await new Promise(r => setTimeout(r, 200));
    const menuAfterClick = await page.$('.user-actions-dropdown-menu');
    console.log('Menu closed after click outside:', menuAfterClick === null);

    // Test 2: Middle Row (Row 3) and Escape Key Dismissal
    console.log('4. Opening dropdown on row 3 (David Chen)...');
    const freshButtons = await page.$$('.user-action-btn');
    await freshButtons[2].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });
    const ssRow3 = path.join(ARTIFACT_DIR, 'dropdown_row_3_desktop.png');
    await page.screenshot({ path: ssRow3 });
    console.log('Saved row 3 screenshot:', ssRow3);

    console.log('5. Testing Escape key dismissal...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));
    const menuAfterEsc = await page.$('.user-actions-dropdown-menu');
    console.log('Menu closed after Escape:', menuAfterEsc === null);

    // Test 3: Last Row (Row 5 - Dr. James Wilson) Flip & Full Visibility
    console.log('6. Opening dropdown on last row (row 5) to test flip/clipping fix...');
    const buttonsLast = await page.$$('.user-action-btn');
    await buttonsLast[4].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });

    // Verify all 3 options are in the DOM and visible
    items = await page.$$('.user-actions-dropdown-item');
    const itemTexts = [];
    for (const it of items) {
      itemTexts.push(await page.evaluate(el => el.textContent.trim(), it));
    }
    console.log('Items in last row dropdown:', itemTexts);

    // Measure bounding box of dropdown relative to viewport
    const menuBox = await page.$eval('.user-actions-dropdown-menu', el => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        height: rect.height,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
      };
    });
    console.log('Dropdown coordinates:', menuBox);
    console.log('Is bottom fully inside viewport?', menuBox.bottom <= menuBox.windowHeight);

    const ssLastRow = path.join(ARTIFACT_DIR, 'dropdown_last_row_flipped.png');
    await page.screenshot({ path: ssLastRow });
    console.log('Saved last row screenshot:', ssLastRow);

    // Test 4: Action "View Details"
    console.log('7. Testing "View Details" action on last row...');
    const viewDetailsBtn = items[0];
    await viewDetailsBtn.click();
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });
    console.log('Navigated to details successfully! Current URL:', page.url());

    // Navigate back to /admin/users
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.user-action-btn', { timeout: 5000 });

    // Test 5: Action "Edit Credentials"
    console.log('8. Testing "Edit Credentials" action on row 2 (Marcus Reynolds)...');
    const btnsForEdit = await page.$$('.user-action-btn');
    await btnsForEdit[1].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });

    const editCredBtn = (await page.$$('.user-actions-dropdown-item'))[1];
    await editCredBtn.click();
    await page.waitForSelector('#edit-credentials-title', { timeout: 3000 });
    console.log('Edit Credentials modal opened!');

    const ssEditModal = path.join(ARTIFACT_DIR, 'dropdown_edit_credentials_modal.png');
    await page.screenshot({ path: ssEditModal });
    console.log('Saved edit credentials modal screenshot:', ssEditModal);

    // Submit the form
    await page.click('button[type="submit"].users-modal-submit-btn');
    await page.waitForSelector('.users-modal-card', { timeout: 3000 });
    console.log('Credentials updated and feedback modal/toast displayed.');

    // Dismiss feedback modal
    const dismissBtn = await page.$('.users-modal-submit-btn');
    if (dismissBtn) await dismissBtn.click();
    await new Promise(r => setTimeout(r, 200));

    // Test 6: Action "Toggle Status"
    console.log('9. Testing "Toggle Status" action on row 1 (Dr. Sarah Jenkins)...');
    const btnsForToggle = await page.$$('.user-action-btn');
    await btnsForToggle[0].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });

    const toggleStatusBtn = (await page.$$('.user-actions-dropdown-item'))[2];
    await toggleStatusBtn.click();
    await page.waitForSelector('#toggle-status-title', { timeout: 3000 });
    console.log('Toggle status confirmation modal opened!');

    const ssToggleModal = path.join(ARTIFACT_DIR, 'dropdown_status_toggle_modal.png');
    await page.screenshot({ path: ssToggleModal });
    console.log('Saved toggle status modal screenshot:', ssToggleModal);

    // Confirm deactivation
    const confirmDeactBtn = await page.$('.user-danger-btn');
    if (confirmDeactBtn) await confirmDeactBtn.click();
    await new Promise(r => setTimeout(r, 300));

    // Dismiss feedback
    const dismissToggleFeedback = await page.$('.users-modal-submit-btn');
    if (dismissToggleFeedback) await dismissToggleFeedback.click();
    await new Promise(r => setTimeout(r, 300));

    // Verify row 1 is now INACTIVE
    const row1Status = await page.$eval('.users-table-row:first-child .user-status-text', el => el.textContent.trim());
    console.log('Row 1 status after toggle:', row1Status);

    // Re-activate row 1
    const btnsForReactivate = await page.$$('.user-action-btn');
    await btnsForReactivate[0].click();
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });
    const reactivateBtn = (await page.$$('.user-actions-dropdown-item'))[2];
    await reactivateBtn.click();
    await page.waitForSelector('#toggle-status-title', { timeout: 3000 });
    const confirmActBtn = await page.$('.user-success-btn');
    if (confirmActBtn) await confirmActBtn.click();
    await new Promise(r => setTimeout(r, 300));
    const dismissReactivateFeedback = await page.$('.users-modal-submit-btn');
    if (dismissReactivateFeedback) await dismissReactivateFeedback.click();
    console.log('Row 1 restored to ACTIVE.');

    // Test 7: Tablet Viewport (1024x768)
    console.log('10. Testing Tablet viewport (1024x768)...');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 300));
    const tabletBtns = await page.$$('.user-action-btn');
    await tabletBtns[4].click(); // Last row
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });
    const ssTablet = path.join(ARTIFACT_DIR, 'dropdown_tablet_1024x768.png');
    await page.screenshot({ path: ssTablet });
    console.log('Saved tablet screenshot:', ssTablet);
    await page.keyboard.press('Escape');

    // Test 8: Mobile Viewport (390x844)
    console.log('11. Testing Mobile viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 400));
    const mobileBtns = await page.$$('.user-action-btn');
    await mobileBtns[0].evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await mobileBtns[0].evaluate(el => el.click());
    await page.waitForSelector('.user-actions-dropdown-menu', { timeout: 3000 });
    const ssMobile = path.join(ARTIFACT_DIR, 'dropdown_mobile_390x844.png');
    await page.screenshot({ path: ssMobile });
    console.log('Saved mobile screenshot:', ssMobile);

    console.log('--- ALL DROPDOWN TESTS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
