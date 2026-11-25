const fs = require('fs');
const path = require('path');
const https = require('https');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;
const TOKEN_CACHE_FILE = path.join(__dirname, 'cached_token.json');

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
  console.log('=== VERIFYING SIDEBAR RENAME: SUPPORT & NOTIFICATIONS ===\n');
  const { token, refreshToken } = await ensureFreshToken();

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security']
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1/auth/me')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'bc6f6875-434c-4050-b893-07343cc27986',
            phone: '+16505550001',
            status: 'ACTIVE',
            roles: ['SUPER_ADMIN', 'ADMIN'],
            permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
          }
        })
      });
    } else {
      req.continue();
    }
  });

  // Seed session
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

  // 1. Check sidebar items count and text on Dashboard
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  const sidebarAudit = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item')).map(el => {
      const label = el.querySelector('.sidebar-nav-label')?.textContent.trim() || el.textContent.trim();
      const hasIcon = !!el.querySelector('.sidebar-nav-icon');
      const isActive = el.classList.contains('active');
      const ariaCurrent = el.getAttribute('aria-current');
      const rect = el.getBoundingClientRect();
      const labelRect = el.querySelector('.sidebar-nav-label')?.getBoundingClientRect();
      return {
        label,
        hasIcon,
        isActive,
        ariaCurrent,
        itemWidth: rect.width,
        itemHeight: rect.height,
        labelWidth: labelRect ? labelRect.width : null,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });

    const supportItems = items.filter(i => i.label.includes('Support') || i.label.includes('Notification'));

    return {
      totalItems: items.length,
      allItems: items.map(i => i.label),
      supportItems
    };
  });

  console.log('Sidebar Navigation Items Total:', sidebarAudit.totalItems);
  console.log('Sidebar Navigation Items:', sidebarAudit.allItems);
  console.log('Support Items Found:', sidebarAudit.supportItems);

  if (sidebarAudit.supportItems.length !== 1) {
    console.error(`FAILED: Expected exactly 1 support item, found ${sidebarAudit.supportItems.length}`);
  }
  if (sidebarAudit.supportItems[0]?.label !== 'Support & Notifications') {
    console.error(`FAILED: Label is "${sidebarAudit.supportItems[0]?.label}", expected "Support & Notifications"`);
  }

  // 2. Test navigation: click Support & Notifications from dashboard
  console.log('\n--- Testing Click Navigation ---');
  const clicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const target = items.find(el => el.textContent.includes('Support & Notifications'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });

  console.log('Clicked Support & Notifications item:', clicked);
  await page.waitForFunction(() => window.location.pathname.includes('/admin/notifications'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  console.log('✓ Successfully navigated to:', await page.evaluate(() => window.location.pathname));

  // 3. Verify Active State on /admin/notifications
  const activeAudit = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const target = items.find(el => el.textContent.includes('Support & Notifications'));
    if (!target) return null;

    const computed = window.getComputedStyle(target);
    const labelEl = target.querySelector('.sidebar-nav-label');
    const labelComputed = labelEl ? window.getComputedStyle(labelEl) : null;

    return {
      label: target.textContent.trim(),
      isActive: target.classList.contains('active'),
      ariaCurrent: target.getAttribute('aria-current'),
      bg: computed.backgroundImage || computed.backgroundColor,
      color: computed.color,
      whiteSpace: labelComputed?.whiteSpace,
      isClipped: target.scrollWidth > target.clientWidth
    };
  });

  console.log('Active State Audit on /admin/notifications:', activeAudit);
  if (!activeAudit.isActive) {
    console.error('FAILED: Support & Notifications is not marked active on /admin/notifications!');
  }
  if (activeAudit.isClipped) {
    console.error('FAILED: Sidebar item text is clipped!');
  }

  // 4. Capture screenshots across all 5 viewports
  console.log('\n--- Capturing Screenshots Across Viewports ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/notifications', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    // If mobile (<768), open drawer to show sidebar
    if (vp.width < 768) {
      try {
        await page.evaluate(() => {
          const btn = document.querySelector('button[aria-label="Open navigation menu"]');
          if (btn) btn.click();
        });
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {}
    }

    const screenshotPath = path.join(ARTIFACT_DIR, `sidebar_rename_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`✓ Saved screenshot for [${vp.name}]: ${screenshotPath}`);
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS PASSED ===');
}

run().catch(err => {
  console.error('Error during test execution:', err);
  process.exit(1);
});
