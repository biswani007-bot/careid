const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== STARTING CREATE USER & EMPTY STATES VERIFICATION ===\n');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    // ---------------------------------------------------------
    // 1. Navigate to User Directory and test "+ Add User" button
    // ---------------------------------------------------------
    console.log('Step 1: Navigating to /admin/users (1280x1024)...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.users-table-row', { timeout: 5000 });
    console.log('✓ User Directory loaded successfully.');

    console.log('Step 2: Clicking "+ Add User" button...');
    const addBtn = await page.$('.users-add-btn');
    if (!addBtn) throw new Error('Could not find .users-add-btn button!');
    await addBtn.click();

    await page.waitForSelector('.create-user-heading', { timeout: 5000 });
    console.log('✓ Navigated to Create User screen:', page.url());

    // ---------------------------------------------------------
    // 2. Verify Page Structure & Design System
    // ---------------------------------------------------------
    const heading = await page.$eval('.create-user-heading', el => el.textContent.trim());
    const breadcrumb = await page.$eval('.create-user-breadcrumbs', el => el.textContent.trim());
    console.log(`✓ Heading: "${heading}"`);
    console.log(`✓ Breadcrumbs: "${breadcrumb}"`);

    // Verify Active Navigation in Sidebar
    const activeNav = await page.$eval('.sidebar-nav-item.active', el => el.textContent.trim());
    console.log(`✓ Active Sidebar Item: "${activeNav}" (should be Users)`);

    // Verify Alternative View Empty State Card
    const emptyStateHeading = await page.$eval('.user-empty-state-card .user-empty-title', el => el.textContent.trim());
    console.log(`✓ Embedded Empty State Heading: "${emptyStateHeading}"`);

    // Capture Full Desktop View of Create User & Alternative View
    const desktopPath = path.join(ARTIFACT_DIR, 'create_user_desktop_1280x1024.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    console.log(`✓ Saved desktop screenshot to: ${desktopPath}`);

    // ---------------------------------------------------------
    // 3. Test Form Validation (Required Fields)
    // ---------------------------------------------------------
    console.log('\nStep 3: Testing form validation with empty inputs...');
    // Clear the password input
    const passwordInput = await page.$('[data-node-id="20:1172"]');
    await passwordInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');

    // Click Save User button to trigger validation
    const submitBtn = await page.$('.create-user-save-btn');
    await submitBtn.click();

    await page.waitForSelector('.create-user-error-text', { timeout: 3000 });
    const errors = await page.$$eval('.create-user-error-text', els => els.map(el => el.textContent.trim()));
    console.log('✓ Validation errors triggered:', errors);

    const validationScreenshot = path.join(ARTIFACT_DIR, 'create_user_validation_errors.png');
    await page.screenshot({ path: validationScreenshot });
    console.log(`✓ Saved validation screenshot to: ${validationScreenshot}`);

    // ---------------------------------------------------------
    // 4. Test Password Generator
    // ---------------------------------------------------------
    console.log('\nStep 4: Testing Password Generator button...');
    const generateBtn = await page.$('.create-user-generate-btn');
    await generateBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const generatedPassword = await page.$eval('[data-node-id="20:1172"]', el => el.value);
    console.log(`✓ Newly generated password: "${generatedPassword}"`);
    if (!generatedPassword || generatedPassword.length < 6) {
      throw new Error('Generated password is empty or too short!');
    }

    // ---------------------------------------------------------
    // 5. Test Role Selection & Form Filling
    // ---------------------------------------------------------
    console.log('\nStep 5: Filling out valid user form...');
    const nameInput = await page.$('[data-node-id="20:1134"]');
    await nameInput.type('Dr. Marcus Vance');

    const emailInput = await page.$('[data-node-id="20:1141"]');
    await emailInput.type('marcus.vance@careid.health');

    const phoneInput = await page.$('[data-node-id="20:1150"]');
    await phoneInput.type('+1 (555) 789-0123');

    // Role is already 'Doctor' by default
    console.log('✓ Filled: Full Name, Email, Phone');

    // Toggle Account Status Switch
    const switchBtn = await page.$('.create-user-switch');
    await switchBtn.click(); // Toggle to inactive
    let isChecked = await page.$eval('.create-user-switch', el => el.getAttribute('aria-checked'));
    console.log(`✓ Switched status to: ${isChecked} (inactive)`);
    await switchBtn.click(); // Toggle back to active
    isChecked = await page.$eval('.create-user-switch', el => el.getAttribute('aria-checked'));
    console.log(`✓ Switched status back to: ${isChecked} (active)`);

    const filledFormScreenshot = path.join(ARTIFACT_DIR, 'create_user_filled_form.png');
    await page.screenshot({ path: filledFormScreenshot });
    console.log(`✓ Saved filled form screenshot to: ${filledFormScreenshot}`);

    // ---------------------------------------------------------
    // 6. Test Submission & TanStack Query Mutation
    // ---------------------------------------------------------
    console.log('\nStep 6: Submitting valid user form...');
    await submitBtn.click();

    // Verify feedback toast appears
    await page.waitForSelector('.user-details-toast', { timeout: 3000 });
    const toastTitle = await page.$eval('.user-details-toast-title', el => el.textContent.trim());
    console.log(`✓ Feedback toast displayed: "${toastTitle}"`);

    // Wait for redirect to /admin/users
    await page.waitForFunction(() => window.location.pathname === '/admin/users', { timeout: 5000 });
    console.log('✓ Successfully redirected back to /admin/users');

    // Wait for table to update and find the newly created user
    await page.waitForSelector('.users-table-row', { timeout: 5000 });
    const userNames = await page.$$eval('.user-name', els => els.map(el => el.textContent.trim()));
    console.log('✓ Users currently in table:', userNames);
    if (!userNames.includes('Dr. Marcus Vance')) {
      throw new Error('Newly created user "Dr. Marcus Vance" not found in user directory!');
    }
    console.log('✓ Confirmed "Dr. Marcus Vance" successfully persisted & rendered in table!');

    // ---------------------------------------------------------
    // 7. Test Empty State in User Directory
    // ---------------------------------------------------------
    console.log('\nStep 7: Testing Empty State in User Directory...');
    const searchInput = await page.$('.users-search-input');
    await searchInput.type('NonExistentDoctorQueryXYZ');
    await new Promise(r => setTimeout(r, 600));

    // Wait for empty state component to render inside directory table
    await page.waitForSelector('.users-empty-row .user-empty-state-card', { timeout: 5000 });
    const emptyTitle = await page.$eval('.users-empty-row .user-empty-title', el => el.textContent.trim());
    const emptyDesc = await page.$eval('.users-empty-row .user-empty-desc', el => el.textContent.trim());
    console.log(`✓ Empty State Heading in table: "${emptyTitle}"`);
    console.log(`✓ Empty State Description: "${emptyDesc}"`);

    const emptyDirScreenshot = path.join(ARTIFACT_DIR, 'user_directory_empty_state.png');
    await page.screenshot({ path: emptyDirScreenshot });
    console.log(`✓ Saved empty state screenshot to: ${emptyDirScreenshot}`);

    // Test "Clear Filters" in Empty State
    console.log('Testing "Clear Filters" button in empty state...');
    const clearBtn = await page.$('.users-empty-row .user-empty-clear-btn');
    await clearBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify users are restored
    const restoredRows = await page.$$('.users-table-row');
    console.log(`✓ Users restored after clear filters: ${restoredRows.length} rows visible.`);
    if (restoredRows.length === 0) {
      throw new Error('Table did not restore users after clicking Clear Filters!');
    }

    // ---------------------------------------------------------
    // 8. Test Responsive Viewports
    // ---------------------------------------------------------
    console.log('\nStep 8: Testing Responsive Viewports...');
    // Tablet Viewport (1024x768)
    await page.goto('http://localhost:5173/admin/users/create', { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 500));
    const tabletScreenshot = path.join(ARTIFACT_DIR, 'create_user_tablet_1024x768.png');
    await page.screenshot({ path: tabletScreenshot });
    console.log(`✓ Saved tablet screenshot (1024x768) to: ${tabletScreenshot}`);

    // Mobile Viewport (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 500));
    const mobileScreenshot = path.join(ARTIFACT_DIR, 'create_user_mobile_390x844.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log(`✓ Saved mobile screenshot (390x844) to: ${mobileScreenshot}`);

    // Test Mobile Hamburger Drawer
    const mobileMenuBtn = await page.$('.create-user-mobile-menu-btn');
    if (mobileMenuBtn) {
      await mobileMenuBtn.click();
      await new Promise(r => setTimeout(r, 500));
      const drawerScreenshot = path.join(ARTIFACT_DIR, 'create_user_mobile_drawer_open.png');
      await page.screenshot({ path: drawerScreenshot });
      console.log(`✓ Saved mobile drawer screenshot to: ${drawerScreenshot}`);
    }

    console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
