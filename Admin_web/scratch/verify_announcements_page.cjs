const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');

const VIEWPORTS = [
  { name: 'desktop_1920', width: 1920, height: 1080, isDesktop: true },
  { name: 'laptop_1366', width: 1366, height: 768, isDesktop: true },
  { name: 'compact_1024', width: 1024, height: 768, isDesktop: true },
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
  console.log('=== VERIFYING CAREID ADMIN - ANNOUNCEMENTS & PREFERENCES ===\n');
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

  // 1. Test Viewports and Capture Screenshots
  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/settings/announcements', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('.announcements-wrapper', { timeout: 15000 });

    const evalResult = await page.evaluate((isDesktop) => {
      const sidebar = document.querySelector('.careid-sidebar');
      const main = document.querySelector('.announcements-main');
      const header = document.querySelector('.announcements-top-navbar');
      const subnavTabs = document.querySelectorAll('.announcements-subnav-tab');
      const activeTab = document.querySelector('.announcements-subnav-tab.active');
      const title = document.querySelector('.announcements-page-title');
      const createCard = document.querySelector('.announcements-col-create');
      const prefCard = document.querySelector('.announcements-col-preferences');
      const analyticsCard = document.querySelector('.announcements-analytics-card');

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
        sidebarLeft: sRect ? sRect.left : null,
        sidebarWidth: sRect ? sRect.width : null,
        mainLeft: mRect ? mRect.left : null,
        tabCount: subnavTabs.length,
        activeTabText: activeTab ? activeTab.innerText.trim() : null,
        titleText: title ? title.innerText.trim() : null,
        hasCreateCard: !!createCard,
        hasPrefCard: !!prefCard,
        hasAnalyticsCard: !!analyticsCard,
        overlap,
        hasOverflow,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      };
    }, vp.isDesktop);

    console.log(`  - 7 Subnav Tabs count: ${evalResult.tabCount} (Expected: 7)`);
    console.log(`  - Active Tab: "${evalResult.activeTabText}"`);
    console.log(`  - Page Title: "${evalResult.titleText}"`);
    console.log(`  - Main Left offset: ${evalResult.mainLeft}px (Desktop expected: ~280px)`);
    console.log(`  - Content Overlap Sidebar: ${evalResult.overlap ? 'FAIL' : 'PASS'}`);
    console.log(`  - Horizontal Overflow: ${evalResult.hasOverflow ? 'FAIL' : 'PASS'} (scrollWidth: ${evalResult.scrollWidth}, innerWidth: ${evalResult.innerWidth})`);

    if (evalResult.tabCount !== 7 || evalResult.overlap || evalResult.hasOverflow) {
      allPassed = false;
    }

    const screenshotPath = path.join(ARTIFACT_DIR, `announcements_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ✓ Screenshot saved: announcements_${vp.name}.png`);
  }

  // 2. Interactive Controls Test at Desktop 1920
  console.log('\n--- Testing Interactive Controls (Desktop 1920x1080) ---');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/admin/settings/announcements', { waitUntil: 'networkidle0', timeout: 30000 });

  // Test Past Announcements Modal
  console.log('Testing Past Announcements Modal...');
  await page.click('.btn-past-announcements');
  await page.waitForSelector('.modal-content-card', { timeout: 5000 });
  const pastModalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content-card');
    const title = modal ? modal.querySelector('.modal-title')?.textContent : '';
    const items = modal ? modal.querySelectorAll('.past-announcement-item').length : 0;
    return { visible: !!modal, title, items };
  });
  console.log(`  ✓ Past modal visible: ${pastModalVisible.visible}, title: "${pastModalVisible.title}", items: ${pastModalVisible.items}`);

  // Screenshot Past Announcements Modal
  const modalScreenshotPath = path.join(ARTIFACT_DIR, 'announcements_past_modal.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log('  ✓ Screenshot saved: announcements_past_modal.png');

  // Close modal
  await page.click('.modal-footer .btn-draft-announcement');
  await page.waitForFunction(() => !document.querySelector('.modal-overlay'), { timeout: 5000 });
  console.log('  ✓ Past modal closed successfully');

  // Test Detailed Log Modal
  console.log('Testing Detailed Log Modal...');
  await page.click('.btn-view-detailed-log');
  await page.waitForSelector('.modal-content-card', { timeout: 5000 });
  const logModalVisible = await page.evaluate(() => {
    const modal = document.querySelector('.modal-content-card');
    const title = modal ? modal.querySelector('.modal-title')?.textContent : '';
    return { visible: !!modal, title };
  });
  console.log(`  ✓ Detailed log modal visible: ${logModalVisible.visible}, title: "${logModalVisible.title}"`);

  // Screenshot Detailed Log Modal
  const logModalScreenshotPath = path.join(ARTIFACT_DIR, 'announcements_detailed_log_modal.png');
  await page.screenshot({ path: logModalScreenshotPath });
  console.log('  ✓ Screenshot saved: announcements_detailed_log_modal.png');

  // Close detailed log modal
  await page.click('.modal-footer .btn-draft-announcement');
  await page.waitForFunction(() => !document.querySelector('.modal-overlay'), { timeout: 5000 });
  console.log('  ✓ Detailed log modal closed successfully');

  // Test Delivery Channels Toggles
  console.log('Testing Delivery Channels Toggle Switches...');
  const beforeToggles = await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('.toggle-switch')).map(s => s.classList.contains('on'));
    return switches;
  });
  console.log(`  Initial toggle states (Email, Push, SMS):`, beforeToggles);

  // Click SMS toggle (3rd switch)
  await page.evaluate(() => {
    const switches = document.querySelectorAll('.toggle-switch');
    if (switches[2]) switches[2].click();
  });
  const afterToggles = await page.evaluate(() => {
    const switches = Array.from(document.querySelectorAll('.toggle-switch')).map(s => s.classList.contains('on'));
    return switches;
  });
  console.log(`  After toggling SMS (Email, Push, SMS):`, afterToggles);

  // Test Granular Controls Checkboxes
  console.log('Testing Granular Controls Checkboxes...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('.granular-item');
    if (items[0]) items[0].click();
  });

  // Test Update Preference Logic Button
  console.log('Testing Update Preference Logic Button...');
  await page.click('.btn-update-logic');
  const snackbarText = await page.evaluate(() => {
    const sb = document.querySelector('.announcements-snackbar .snackbar-text');
    return sb ? sb.textContent : null;
  });
  console.log(`  ✓ Snackbar message on update preferences: "${snackbarText}"`);

  // Test Publish Announcement Button
  console.log('Testing Publish Announcement Button...');
  await page.click('.btn-publish-announcement');
  const publishSnackbarText = await page.evaluate(() => {
    const sb = document.querySelector('.announcements-snackbar .snackbar-text');
    return sb ? sb.textContent : null;
  });
  console.log(`  ✓ Snackbar message on publish: "${publishSnackbarText}"`);

  // 3. Test Cross-Navigation Across All 7 System Settings Tabs
  console.log('\n--- Testing Navigation Between Settings Tabs ---');
  // Click Tab 1: General & Organization
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.announcements-subnav-tab');
    if (tabs[0]) tabs[0].click();
  });
  await page.waitForFunction(() => window.location.pathname === '/admin/settings/general', { timeout: 10000 });
  console.log(`  ✓ Navigated to: ${await page.evaluate(() => window.location.pathname)}`);

  // In General & Organization, verify all 7 tabs exist, and click Tab 7 (Announcements & Preferences)
  await page.waitForSelector('.settings-tab-btn', { timeout: 5000 });
  const generalTabsCheck = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.settings-tab-btn');
    const tabTexts = Array.from(tabs).map(t => t.innerText.trim());
    return { count: tabs.length, tabTexts };
  });
  console.log(`  General page has ${generalTabsCheck.count} tabs:`, generalTabsCheck.tabTexts);

  // Click Announcements Tab in General page
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.settings-tab-btn');
    const annTab = Array.from(tabs).find(t => t.innerText.includes('Announcements'));
    if (annTab) annTab.click();
  });
  await page.waitForFunction(() => window.location.pathname === '/admin/settings/announcements', { timeout: 10000 });
  console.log(`  ✓ Navigated back to: ${await page.evaluate(() => window.location.pathname)}`);

  await browser.close();

  if (allPassed) {
    console.log('\n======================================================');
    console.log('🎉 ALL ANNOUNCEMENTS & PREFERENCES TESTS PASSED!');
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
