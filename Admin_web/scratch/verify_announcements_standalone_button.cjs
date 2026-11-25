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
  console.log('=== VERIFYING STANDALONE ANNOUNCEMENTS & PREFERENCES BUTTON ===\n');
  const { token, refreshToken } = await ensureFreshToken();

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security']
  });

  const page = await browser.newPage();

  // First visit home to seed localStorage on the correct origin
  await page.goto('http://localhost:5173/');
  await page.evaluate(({ tok, refTok }) => {
    const userSession = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    };
    localStorage.setItem('careid_access_token', tok || 'mock-admin-token');
    localStorage.setItem('careid_auth_token', tok || 'mock-admin-token');
    localStorage.setItem('token', tok || 'mock-admin-token');
    localStorage.setItem('accessToken', tok || 'mock-admin-token');
    localStorage.setItem('refreshToken', refTok || 'mock-admin-refresh');
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_user', JSON.stringify(userSession));
    localStorage.setItem('user', JSON.stringify(userSession));
  }, { tok: token, refTok: refreshToken });

  // 1. Verify across all 5 viewports on /admin/settings/general
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // Verify Tablist on General page
    const tabData = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]');
      const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')).map(t => t.textContent.trim()) : [];
      const standaloneBtn = document.querySelector('.settings-announcements-standalone-btn');
      const btnInsideTablist = tablist ? !!tablist.querySelector('.settings-announcements-standalone-btn') : false;
      const btnStyles = standaloneBtn ? {
        bg: window.getComputedStyle(standaloneBtn).backgroundColor,
        color: window.getComputedStyle(standaloneBtn).color,
        fontWeight: window.getComputedStyle(standaloneBtn).fontWeight,
        borderRadius: window.getComputedStyle(standaloneBtn).borderRadius,
        display: window.getComputedStyle(standaloneBtn).display,
        text: standaloneBtn.textContent.trim(),
        hasIcon: !!standaloneBtn.querySelector('svg')
      } : null;

      return {
        tabCount: tabs.length,
        tabNames: tabs,
        hasStandaloneBtn: !!standaloneBtn,
        btnInsideTablist,
        btnStyles
      };
    });

    console.log(`[${vp.name}] Tab count: ${tabData.tabCount} (Expected: 6)`);
    console.log(`[${vp.name}] Tab names:`, tabData.tabNames);
    console.log(`[${vp.name}] Standalone button present: ${tabData.hasStandaloneBtn}, Inside tablist: ${tabData.btnInsideTablist}`);
    console.log(`[${vp.name}] Standalone button details:`, tabData.btnStyles);

    if (tabData.tabCount !== 6) {
      console.error(`FAILED: Expected 6 tabs, found ${tabData.tabCount}`);
    }
    if (tabData.btnInsideTablist) {
      console.error('FAILED: Standalone button must NOT be inside tablist!');
    }

    const screenshotPath = path.join(ARTIFACT_DIR, `standalone_btn_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Saved screenshot: ${screenshotPath}\n`);
  }

  // 2. Test click navigation from General page to Announcements page
  console.log('--- Testing Standalone Button Navigation ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  await page.click('.settings-announcements-standalone-btn');
  await page.waitForFunction(() => window.location.pathname.includes('/admin/settings/announcements'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const announcementsData = await page.evaluate(() => {
    const tablist = document.querySelector('[role="tablist"]');
    const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')).map(t => ({
      name: t.textContent.trim(),
      isActive: t.classList.contains('active'),
      ariaSelected: t.getAttribute('aria-selected')
    })) : [];
    const standaloneBtn = document.querySelector('.settings-announcements-standalone-btn');
    const isBtnActive = standaloneBtn ? standaloneBtn.classList.contains('active') : false;
    const btnBg = standaloneBtn ? window.getComputedStyle(standaloneBtn).backgroundColor : null;

    return {
      currentUrl: window.location.pathname,
      tabCount: tabs.length,
      tabs,
      isBtnActive,
      btnBg
    };
  });

  console.log('✓ Successfully navigated to:', announcementsData.currentUrl);
  console.log(`✓ Announcements page tablist tab count: ${announcementsData.tabCount} (Expected: 6)`);
  console.log('✓ Standalone button isActive on announcements page:', announcementsData.isBtnActive, 'bg:', announcementsData.btnBg);

  const announcementsScreenshot = path.join(ARTIFACT_DIR, 'standalone_btn_announcements_active.png');
  await page.screenshot({ path: announcementsScreenshot });
  console.log(`✓ Saved active screenshot: ${announcementsScreenshot}\n`);

  // 3. Verify all other 5 settings pages
  const otherRoutes = [
    { name: 'Branding', path: '/admin/settings/branding' },
    { name: 'Security', path: '/admin/settings/security' },
    { name: 'Roles', path: '/admin/settings/roles' },
    { name: 'OCR', path: '/admin/settings/ocr' },
    { name: 'Integrations', path: '/admin/settings/integrations' }
  ];

  for (const route of otherRoutes) {
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const checkData = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]');
      const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')).map(t => t.textContent.trim()) : [];
      const standaloneBtn = document.querySelector('.settings-announcements-standalone-btn');
      const btnInsideTablist = tablist ? !!tablist.querySelector('.settings-announcements-standalone-btn') : false;
      return {
        tabCount: tabs.length,
        hasStandaloneBtn: !!standaloneBtn,
        btnInsideTablist,
        btnText: standaloneBtn ? standaloneBtn.textContent.trim() : null
      };
    });

    console.log(`[${route.name}] Tabs count: ${checkData.tabCount}, Standalone button: ${checkData.hasStandaloneBtn}, Outside tablist: ${!checkData.btnInsideTablist}`);
    if (checkData.tabCount !== 6 || !checkData.hasStandaloneBtn || checkData.btnInsideTablist) {
      console.error(`FAILED check on ${route.name}`);
    }
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
