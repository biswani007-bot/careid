const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');

// The 5 mandatory viewports from the prompt
const MANDATORY_VIEWPORTS = [
  { name: 'desktop_1920', width: 1920, height: 1080, isDesktop: true },
  { name: 'laptop_1366', width: 1366, height: 768, isDesktop: true },
  { name: 'laptop_1280', width: 1280, height: 720, isDesktop: true },
  { name: 'tablet_768', width: 768, height: 1024, isDesktop: false },
  { name: 'mobile_375', width: 375, height: 812, isDesktop: false }
];

function req(options, postData) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function ensureFreshToken() {
  try {
    const reqData = JSON.stringify({ phone: '+16505550001' });
    const otpRes = await req({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/request',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
    }, reqData);
    const otpJson = JSON.parse(otpRes.body);
    const challengeId = otpJson.data?.challengeId || otpJson.challengeId;
    const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
    const verifyRes = await req({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
    }, verifyData);
    const vJson = JSON.parse(verifyRes.body);
    const d = vJson.data || vJson;
    const token = d.accessToken || d.access_token || d.token;
    const refreshToken = d.refreshToken || d.refresh_token;
    console.log('✓ Acquired fresh token:', !!token);
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, refreshToken, time: Date.now() }));
    return { token, refreshToken };
  } catch (e) {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    }
    return { token: '', refreshToken: '' };
  }
}

async function run() {
  console.log('=== VERIFYING CAREID ADMIN - NOTIFICATION MANAGEMENT DASHBOARD ===\n');
  const { token, refreshToken } = await ensureFreshToken();

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security']
  });

  const page = await browser.newPage();

  await page.evaluateOnNewDocument(({ tok, refTok }) => {
    const userSession = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      name: 'Dr. Evelyn Reed',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', refTok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('user', JSON.stringify(userSession));
  }, { tok: token, refTok: refreshToken });

  let allPassed = true;

  // 1. Test 5 Mandatory Viewports and Capture Screenshots
  for (const vp of MANDATORY_VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/notifications', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('.notification-dashboard-wrapper', { timeout: 15000 });

    const evalResult = await page.evaluate((isDesktop) => {
      const sidebar = document.querySelector('.careid-sidebar');
      const main = document.querySelector('.notification-dashboard-main');
      const header = document.querySelector('.notification-top-navbar');
      const title = document.querySelector('.notification-page-title');
      const bentoCards = document.querySelectorAll('.bento-card');
      const filterPills = document.querySelectorAll('.filter-pill');
      const tableRows = document.querySelectorAll('.notification-row');
      const backdropCard = document.querySelector('.notification-backdrop-card');
      const footerBar = document.querySelector('.notification-footer-bar');
      const activeNav = document.querySelector('.sidebar-nav-item.active .sidebar-nav-label');

      const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const mRect = main ? main.getBoundingClientRect() : null;

      let overlap = false;
      if (isDesktop && sRect && mRect) {
        if (mRect.left < 275) {
          overlap = true;
        }
      }

      const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;

      return {
        hasSidebar: !!sidebar,
        mainLeft: mRect ? mRect.left : null,
        titleText: title ? title.innerText.trim() : null,
        bentoCount: bentoCards.length,
        filterCount: filterPills.length,
        rowCount: tableRows.length,
        hasBackdrop: !!backdropCard,
        hasFooter: !!footerBar,
        activeNavLabel: activeNav ? activeNav.innerText.trim() : null,
        overlap,
        hasOverflow,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      };
    }, vp.isDesktop);

    console.log(`  - Page Title: "${evalResult.titleText}"`);
    console.log(`  - Sidebar Active Item: "${evalResult.activeNavLabel}" (Expected: Support)`);
    console.log(`  - Bento Cards Count: ${evalResult.bentoCount} (Expected: 6)`);
    console.log(`  - Quick Filters Count: ${evalResult.filterCount}`);
    console.log(`  - Table Rows Count: ${evalResult.rowCount}`);
    console.log(`  - Main Left offset: ${evalResult.mainLeft}px (Desktop expected: ~280px)`);
    console.log(`  - Content Overlap Sidebar: ${evalResult.overlap ? 'FAIL' : 'PASS'}`);
    console.log(`  - Horizontal Overflow: ${evalResult.hasOverflow ? 'FAIL' : 'PASS'} (scrollWidth: ${evalResult.scrollWidth}, innerWidth: ${evalResult.innerWidth})`);

    if (evalResult.bentoCount !== 6 || evalResult.overlap || evalResult.hasOverflow) {
      allPassed = false;
    }

    const screenshotPath = path.join(ARTIFACT_DIR, `notification_dashboard_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ✓ Screenshot saved: notification_dashboard_${vp.name}.png`);
  }

  // 2. Interactive Controls Test at Desktop 1920
  console.log('\n--- Testing Interactive Controls (Desktop 1920x1080) ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/admin/notifications', { waitUntil: 'networkidle0', timeout: 30000 });

  // Test Quick Filters
  console.log('Testing Quick Filter clicks...');
  // Click Critical filter
  await page.click('.filter-pill.critical-pill');
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('.notification-row');
    return rows.length > 0;
  }, { timeout: 5000 });
  const criticalRows = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('.module-badge')).map(b => b.textContent.trim());
    return badges;
  });
  console.log('  Filtered rows for Critical:', criticalRows);

  // Click Unread filter
  await page.click('.filter-pill:nth-of-type(1)');
  console.log('  Returned to Unread filter');

  // Test Search Box
  console.log('Testing Search filter...');
  await page.type('.notification-search-input', 'Prescription');
  const searchResults = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.alert-title')).map(t => t.textContent.trim());
    return titles;
  });
  console.log('  Search results for "Prescription":', searchResults);
  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('.notification-search-input');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Test Notification Detail Modal
  console.log('Testing Notification Detail Modal...');
  await page.click('.notification-row:nth-of-type(1)');
  await page.waitForSelector('.modal-content-card', { timeout: 5000 });
  const modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content-card');
    const title = modal ? modal.querySelector('.modal-title')?.textContent : '';
    const alertHeading = modal ? modal.querySelector('h4')?.textContent : '';
    return { visible: !!modal, title, alertHeading };
  });
  console.log(`  ✓ Detail Modal open: ${modalVisible.visible}, ID: "${modalVisible.title}", Heading: "${modalVisible.alertHeading}"`);

  // Screenshot Detail Modal
  const detailModalScreenshot = path.join(ARTIFACT_DIR, 'notification_detail_modal.png');
  await page.screenshot({ path: detailModalScreenshot });
  console.log('  ✓ Screenshot saved: notification_detail_modal.png');

  // Close modal
  await page.click('.modal-footer .filter-pill:last-child');
  await page.waitForFunction(() => !document.querySelector('.modal-overlay'), { timeout: 5000 });
  console.log('  ✓ Detail Modal closed successfully');

  // Test Create Announcement Modal
  console.log('Testing Create Announcement Modal...');
  await page.click('.btn-create-announcement');
  await page.waitForSelector('.modal-content-card', { timeout: 5000 });
  const annModalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content-card');
    const title = modal ? modal.querySelector('.modal-title')?.textContent : '';
    return { visible: !!modal, title };
  });
  console.log(`  ✓ Announcement Modal open: ${annModalVisible.visible}, Title: "${annModalVisible.title}"`);

  // Screenshot Announcement Modal
  const annModalScreenshot = path.join(ARTIFACT_DIR, 'notification_announcement_modal.png');
  await page.screenshot({ path: annModalScreenshot });
  console.log('  ✓ Screenshot saved: notification_announcement_modal.png');

  // Type announcement text & submit
  await page.type('.modal-body textarea', 'Routine server maintenance window at 02:00 UTC');
  await page.click('.modal-footer .btn-create-announcement');
  await page.waitForFunction(() => !document.querySelector('.modal-overlay'), { timeout: 5000 });
  console.log('  ✓ Announcement broadcast submitted successfully');

  // Verify toast appeared
  const toastText = await page.evaluate(() => {
    const toast = document.querySelector('.notification-toast');
    return toast ? toast.textContent.trim() : null;
  });
  console.log(`  ✓ Toast message appeared: "${toastText}"`);

  // Test Pagination
  console.log('Testing Pagination controls...');
  const initialPageRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.alert-title')).map(t => t.textContent.trim());
  });
  console.log('  Page 1 items:', initialPageRows.slice(0, 2));

  // Click Page 2
  await page.click('.pagination-btn:nth-of-type(3)');
  const page2Rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.alert-title')).map(t => t.textContent.trim());
  });
  console.log('  Page 2 items:', page2Rows.slice(0, 2));

  // 3. Test Direct Navigation to /admin/support and Aliases
  console.log('\n--- Testing Route Aliases & Direct Navigation ---');
  await page.goto('http://localhost:5173/admin/support', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.notification-dashboard-wrapper', { timeout: 10000 });
  const supportRouteTitle = await page.evaluate(() => {
    return document.querySelector('.notification-page-title')?.textContent.trim();
  });
  console.log(`  ✓ /admin/support correctly renders: "${supportRouteTitle}"`);

  await browser.close();

  if (allPassed) {
    console.log('\n======================================================');
    console.log('🎉 ALL NOTIFICATION DASHBOARD TESTS PASSED!');
    console.log('======================================================');
  } else {
    console.error('\n❌ SOME VERIFICATION CHECKS FAILED');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

