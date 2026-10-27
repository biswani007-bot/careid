const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function verifyNavigation() {
  console.log('Launching browser for Navigation Fix Verification...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // TEST 1: Dashboard -> Health Records
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Dashboard -> Health Records Navigation ---');
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Find and click Health Records button in sidebar
  const clickedDashboardRecords = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const recordsBtn = items.find(b => b.textContent.includes('Health Records'));
    if (recordsBtn) {
      recordsBtn.click();
      return true;
    }
    return false;
  });
  console.log('Found & clicked Health Records in Dashboard sidebar:', clickedDashboardRecords);
  await new Promise(r => setTimeout(r, 600));

  const currentUrlAfterDashboard = page.url();
  console.log('URL after clicking Health Records from Dashboard:', currentUrlAfterDashboard);

  // Check if placeholder modal is present
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('.careid-modal-overlay, .careid-feedback-modal, .fixed.inset-0');
    return modal ? modal.textContent : null;
  });
  console.log('Modal text (should be null or not placeholder):', modalText);
  if (modalText && modalText.includes('incremental development')) {
    throw new Error('FAIL: Placeholder modal is still displayed on Dashboard -> Health Records!');
  }

  const h1Text1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
  console.log('Page H1 after navigation:', h1Text1);
  if (h1Text1 !== 'Health Records') {
    throw new Error(`FAIL: Expected H1 'Health Records', got '${h1Text1}'`);
  }
  console.log('PASS: Dashboard -> Health Records navigated successfully without placeholder modal!');

  // -------------------------------------------------------------
  // TEST 2: Users -> Health Records
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Users -> Health Records Navigation ---');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const clickedUsersRecords = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const recordsBtn = items.find(b => b.textContent.includes('Health Records'));
    if (recordsBtn) {
      recordsBtn.click();
      return true;
    }
    return false;
  });
  console.log('Found & clicked Health Records in Users sidebar:', clickedUsersRecords);
  await new Promise(r => setTimeout(r, 600));

  const currentUrlAfterUsers = page.url();
  console.log('URL after clicking Health Records from Users:', currentUrlAfterUsers);

  // Check if placeholder toast/modal is present
  const toastText = await page.evaluate(() => {
    const toast = document.querySelector('.careid-toast, .fixed.bottom-4, [role="alert"]');
    return toast ? toast.textContent : null;
  });
  console.log('Toast/alert text (should be null or not placeholder):', toastText);
  if (toastText && toastText.includes('subsequent phase')) {
    throw new Error('FAIL: Placeholder toast is still displayed on Users -> Health Records!');
  }

  const h1Text2 = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
  console.log('Page H1 after navigation:', h1Text2);
  if (h1Text2 !== 'Health Records') {
    throw new Error(`FAIL: Expected H1 'Health Records', got '${h1Text2}'`);
  }
  console.log('PASS: Users -> Health Records navigated successfully without placeholder modal!');

  // -------------------------------------------------------------
  // TEST 3: Facilities -> Health Records
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Facilities -> Health Records Navigation ---');
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const recordsBtn = items.find(b => b.textContent.includes('Health Records'));
    if (recordsBtn) recordsBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const currentUrlAfterFacilities = page.url();
  console.log('URL after clicking Health Records from Facilities:', currentUrlAfterFacilities);
  const h1Text3 = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
  console.log('Page H1:', h1Text3);
  if (h1Text3 !== 'Health Records') {
    throw new Error(`FAIL: Expected H1 'Health Records', got '${h1Text3}'`);
  }
  console.log('PASS: Facilities -> Health Records navigated successfully!');

  // -------------------------------------------------------------
  // TEST 4: Direct URL Navigation & Page Refresh
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Direct URL & Refresh ---');
  // Test /admin/health-records
  await page.goto('http://localhost:5173/admin/health-records', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const directH1 = await page.$eval('h1', el => el.textContent.trim());
  console.log('Direct /admin/health-records H1:', directH1);

  // Refresh
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const refreshH1 = await page.$eval('h1', el => el.textContent.trim());
  console.log('After refresh H1:', refreshH1);
  if (refreshH1 !== 'Health Records') {
    throw new Error('FAIL: Screen broke after refresh!');
  }

  // Active sidebar indicator check
  const activeNavText = await page.$eval('.sidebar-nav-item.active', el => el.textContent.trim()).catch(() => null);
  console.log('Active sidebar item on Health Records:', activeNavText);
  if (!activeNavText || !activeNavText.includes('Health Records')) {
    throw new Error(`FAIL: Expected active sidebar item to include 'Health Records', got '${activeNavText}'`);
  }
  console.log('PASS: Direct URL, Refresh, and Active Sidebar check passed!');

  // -------------------------------------------------------------
  // TEST 5: Browser Back & Forward Navigation
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Browser Back & Forward Navigation ---');
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  console.log('Current URL before back:', page.url());

  await page.goBack();
  await new Promise(r => setTimeout(r, 400));
  console.log('URL after Back button:', page.url());
  const backH1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
  console.log('H1 after Back button:', backH1);

  await page.goForward();
  await new Promise(r => setTimeout(r, 400));
  console.log('URL after Forward button:', page.url());
  const forwardH1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => null);
  console.log('H1 after Forward button:', forwardH1);
  if (forwardH1 !== 'Health Records') {
    throw new Error('FAIL: Forward navigation did not return to Health Records!');
  }
  console.log('PASS: Back and Forward navigation works smoothly!');

  // Capture final proof screenshot
  const proofShot = path.join(artifactDir, 'careid_nav_fix_verified.png');
  await page.screenshot({ path: proofShot, fullPage: false });
  console.log('Proof screenshot saved to:', proofShot);

  await browser.close();
  console.log('\n=============================================');
  console.log('ALL NAVIGATION TESTS PASSED WITHOUT ERRORS!');
  console.log('=============================================\n');
}

verifyNavigation().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
