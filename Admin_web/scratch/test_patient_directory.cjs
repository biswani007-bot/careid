const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== STARTING PATIENT DIRECTORY VERIFICATION SUITE ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('PAGE ERROR:', msg.text());
      }
    });

    // ------------------------------------------------------------------
    // Step 1: Navigating to /admin/patients (1280x1024 Desktop)
    // ------------------------------------------------------------------
    console.log('Step 1: Navigating to /admin/patients (1280x1024)...');
    await page.setViewport({ width: 1280, height: 1024 });
    await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle0' });

    await page.waitForSelector('.patients-title', { timeout: 5000 });
    const screenTitle = await page.$eval('.patients-title', (el) => el.textContent.trim());
    console.log(`✓ Screen Title: "${screenTitle}"`);

    // Verify Active Sidebar Nav item is Patients
    const activeNavLabel = await page.$eval(
      '.sidebar-nav-item.active .sidebar-nav-label',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Active Sidebar Item: "${activeNavLabel}"`);
    if (activeNavLabel !== 'Patients') {
      throw new Error(`Expected active sidebar item to be 'Patients', but got '${activeNavLabel}'`);
    }

    // Verify 4 Bento KPI Cards
    const kpiCards = await page.$$('.patients-kpi-card');
    console.log(`✓ Found ${kpiCards.length} Bento KPI Summary Cards.`);
    if (kpiCards.length !== 4) {
      throw new Error(`Expected 4 KPI cards, found ${kpiCards.length}`);
    }

    const kpiValues = await page.$$eval('.patients-kpi-value', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ KPI Card Values:', kpiValues);

    // Verify Breadcrumbs
    const breadcrumbCurrent = await page.$eval(
      '.patients-breadcrumb-current',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Breadcrumbs Current: "${breadcrumbCurrent}"`);

    // Verify Table Headers and Initial Rows
    const tableHeaders = await page.$$eval('.patients-table-header th', (els) =>
      els.map((el) => el.textContent.trim()).filter(Boolean)
    );
    console.log('✓ Table Headers:', tableHeaders);

    const initialRowsCount = (await page.$$('.patients-table-row')).length;
    console.log(`✓ Initial rendered table rows count: ${initialRowsCount}`);
    if (initialRowsCount < 3) {
      throw new Error(`Expected at least 3 rows in table, got ${initialRowsCount}`);
    }

    // Capture Full Desktop Screenshot
    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'patient_directory_desktop_1280x1024.png');
    await page.screenshot({ path: desktopScreenshotPath });
    console.log(`✓ Saved desktop screenshot to: ${desktopScreenshotPath}`);

    // ------------------------------------------------------------------
    // Step 2: Test Search Functionality
    // ------------------------------------------------------------------
    console.log('\nStep 2: Testing Patient Search Filter...');
    async function setInput(selector, val) {
      await page.evaluate((sel, v) => {
        const input = document.querySelector(sel);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, v);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, selector, val);
      await new Promise((r) => setTimeout(r, 400));
    }

    await setInput('.patients-header-search-input', 'Eleanor');

    let rowNames = await page.$$eval('.patients-name', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ Rows matching "Eleanor":', rowNames);
    if (!rowNames.includes('Eleanor Vance') || rowNames.length !== 1) {
      throw new Error(`Expected only Eleanor Vance in search results, got: ${JSON.stringify(rowNames)}`);
    }

    // Test Search by Vault ID
    await setInput('.patients-header-search-input', 'HV-9102-C');

    rowNames = await page.$$eval('.patients-name', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ Rows matching "HV-9102-C":', rowNames);
    if (!rowNames.includes('Marcus Sterling') || rowNames.length !== 1) {
      throw new Error(`Expected only Marcus Sterling in Vault ID search, got: ${JSON.stringify(rowNames)}`);
    }

    // Reset search
    await setInput('.patients-header-search-input', '');

    // ------------------------------------------------------------------
    // Step 3: Test Status Filter Dropdown
    // ------------------------------------------------------------------
    console.log('\nStep 3: Testing Status Filter Dropdown...');
    const statusPill = await page.$('.patients-filter-pill');
    await statusPill.click();
    await page.waitForSelector('.patients-filter-menu', { timeout: 2000 });

    // Select "Inactive"
    const menuItems = await page.$$('.patients-filter-menu-item');
    for (const item of menuItems) {
      const text = await page.evaluate((el) => el.textContent.trim(), item);
      if (text === 'Inactive') {
        await item.click();
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    rowNames = await page.$$eval('.patients-name', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ Rows matching Status "Inactive":', rowNames);
    if (!rowNames.includes('Sarah Jenkins')) {
      throw new Error('Expected Sarah Jenkins in inactive filter results');
    }

    // Reset Status to "All Status"
    await statusPill.click();
    await page.waitForSelector('.patients-filter-menu', { timeout: 2000 });
    const allStatusBtn = (await page.$$('.patients-filter-menu-item'))[0];
    await allStatusBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // ------------------------------------------------------------------
    // Step 4: Test Row Kebab Action Menu & Status Toggle Modal
    // ------------------------------------------------------------------
    console.log('\nStep 4: Testing Patient Kebab Actions & Deactivate Dialog...');
    const firstRowKebab = await page.$('.patients-table-row:first-child .patients-action-btn');
    await firstRowKebab.click();

    await page.waitForSelector('.patients-row-menu', { timeout: 2000 });
    const actionItems = await page.$$eval('.patients-row-menu-item', (els) =>
      els.map((el) => el.textContent.trim())
    );
    console.log('✓ Kebab Menu Actions:', actionItems);

    // Click "Suspend Account"
    const suspendBtn = await page.$('.patients-row-menu-item.danger');
    await suspendBtn.click();

    // Verify Deactivate Dialog opened
    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const dialogTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    const dialogDesc = await page.$eval(
      '.user-dialog-backdrop .user-dialog-desc',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Deactivate Dialog opened: "${dialogTitle}" - "${dialogDesc}"`);

    const dialogScreenshotPath = path.join(ARTIFACT_DIR, 'patient_directory_suspend_dialog.png');
    await page.screenshot({ path: dialogScreenshotPath });
    console.log(`✓ Saved dialog screenshot to: ${dialogScreenshotPath}`);

    // Confirm Deactivation
    const confirmBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-deactivate');
    await confirmBtn.click();

    // Verify Snackbar appeared
    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const snackbarText = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Success Snackbar text: "${snackbarText}"`);

    // Verify Row Status is now Inactive
    await new Promise((r) => setTimeout(r, 400));
    const firstRowStatus = await page.$eval(
      '.patients-table-row:first-child .patients-status-text',
      (el) => el.textContent.trim()
    );
    console.log(`✓ First row status is now: "${firstRowStatus}"`);
    if (firstRowStatus !== 'Inactive') {
      throw new Error(`Expected first row status to be 'Inactive', got '${firstRowStatus}'`);
    }

    // Now Reactivate Eleanor Vance
    console.log('Testing Reactivate flow...');
    const firstRowKebabAgain = await page.$('.patients-table-row:first-child .patients-action-btn');
    await firstRowKebabAgain.click();
    await page.waitForSelector('.patients-row-menu', { timeout: 2000 });

    const activateMenuBtn = (await page.$$('.patients-row-menu-item'))[1];
    await activateMenuBtn.click();

    await page.waitForSelector('.user-dialog-backdrop', { timeout: 3000 });
    const activateTitle = await page.$eval(
      '.user-dialog-backdrop .user-dialog-title',
      (el) => el.textContent.trim()
    );
    console.log(`✓ Reactivate Dialog Title: "${activateTitle}"`);

    const confirmActivateBtn = await page.$('.user-dialog-backdrop .user-dialog-btn-activate');
    await confirmActivateBtn.click();

    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const reactivateSnackbar = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Reactivated Snackbar: "${reactivateSnackbar}"`);

    // ------------------------------------------------------------------
    // Step 5: Test Header Export List Action
    // ------------------------------------------------------------------
    console.log('\nStep 5: Testing Header Export List Action...');
    const exportBtn = await page.$('.patients-btn-export');
    await exportBtn.click();

    await page.waitForSelector('.user-action-snackbar', { timeout: 3000 });
    const exportSnackbar = await page.$eval('.user-action-snackbar-text', (el) => el.textContent.trim());
    console.log(`✓ Export Action Feedback: "${exportSnackbar}"`);

    // ------------------------------------------------------------------
    // Step 6: Test Responsive Viewports (Tablet & Mobile)
    // ------------------------------------------------------------------
    console.log('\nStep 6: Testing Responsive Breakpoints...');

    // Tablet (1024x768)
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise((r) => setTimeout(r, 400));
    const tabletScreenshotPath = path.join(ARTIFACT_DIR, 'patient_directory_tablet_1024x768.png');
    await page.screenshot({ path: tabletScreenshotPath });
    console.log(`✓ Saved tablet screenshot (1024x768) to: ${tabletScreenshotPath}`);

    // Mobile (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 400));
    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'patient_directory_mobile_390x844.png');
    await page.screenshot({ path: mobileScreenshotPath });
    console.log(`✓ Saved mobile screenshot (390x844) to: ${mobileScreenshotPath}`);

    console.log('\n=== ALL PATIENT DIRECTORY TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
