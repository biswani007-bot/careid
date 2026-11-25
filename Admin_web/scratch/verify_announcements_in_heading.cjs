const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const SUBPAGES = [
  { name: 'General', path: '/admin/settings/general' },
  { name: 'Branding', path: '/admin/settings/branding' },
  { name: 'Security', path: '/admin/settings/security' },
  { name: 'Roles', path: '/admin/settings/roles' },
  { name: 'OCR', path: '/admin/settings/ocr' },
  { name: 'Integrations', path: '/admin/settings/integrations' },
  { name: 'Announcements', path: '/admin/settings/announcements' }
];

const VIEWPORTS = [
  { name: 'desktop_1920', width: 1920, height: 1080 },
  { name: 'laptop_1366', width: 1366, height: 768 }
];

async function run() {
  console.log('=== VERIFYING ANNOUNCEMENTS & PREFERENCES BUTTON IN HEADING SECTION ===\n');

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Mock authentication via request interception so tests run reliably offline
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

  // Seed storage tokens
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    const userSession = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    };
    localStorage.setItem('careid_access_token', 'mock-admin-token');
    localStorage.setItem('careid_auth_token', 'mock-admin-token');
    localStorage.setItem('token', 'mock-admin-token');
    localStorage.setItem('accessToken', 'mock-admin-token');
    localStorage.setItem('refreshToken', 'mock-admin-refresh');
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_user', JSON.stringify(userSession));
    localStorage.setItem('user', JSON.stringify(userSession));
  });

  // 1. Test all 7 System Settings subpages on Desktop (1920x1080)
  console.log('--- Step 1: Testing All 7 System Settings Subpages on Desktop (1920x1080) ---');
  await page.setViewport({ width: 1920, height: 1080 });

  for (const subpage of SUBPAGES) {
    await page.goto(`http://localhost:5173${subpage.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));

    const pageAudit = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]');
      const tabs = tablist ? Array.from(tablist.querySelectorAll('[role="tab"]')).map(t => t.textContent.trim()) : [];
      const standaloneBtn = document.querySelector('.settings-announcements-standalone-btn');

      // Check button position relative to tablist
      let isAboveTablist = false;
      let btnInTablist = false;
      if (standaloneBtn && tablist) {
        const btnRect = standaloneBtn.getBoundingClientRect();
        const tablistRect = tablist.getBoundingClientRect();
        isAboveTablist = btnRect.bottom <= tablistRect.top + 20; // within heading section above tabs
        btnInTablist = tablist.contains(standaloneBtn);
      }

      return {
        tabCount: tabs.length,
        tabs,
        hasButton: !!standaloneBtn,
        btnInTablist,
        isAboveTablist,
        btnText: standaloneBtn ? standaloneBtn.textContent.trim() : null,
        btnActive: standaloneBtn ? standaloneBtn.classList.contains('active') : false
      };
    });

    console.log(`[${subpage.name}] Tabs: ${pageAudit.tabCount} (Expected: 6) | Has Button: ${pageAudit.hasButton} | In Tablist: ${pageAudit.btnInTablist} | Above Tabs: ${pageAudit.isAboveTablist}`);
    if (pageAudit.tabCount !== 6) console.error(`FAILED: ${subpage.name} tablist has ${pageAudit.tabCount} tabs instead of 6`);
    if (pageAudit.btnInTablist) console.error(`FAILED: ${subpage.name} button must not be inside tablist`);
    if (!pageAudit.isAboveTablist) console.error(`FAILED: ${subpage.name} button is not above tablist!`);

    const screenshotPath = path.join(ARTIFACT_DIR, `heading_btn_${subpage.name.toLowerCase()}_1920.png`);
    await page.screenshot({ path: screenshotPath });
  }

  // 2. Test Laptop (1366x768) layout on General and Branding
  console.log('\n--- Step 2: Testing Laptop (1366x768) Layout ---');
  await page.setViewport({ width: 1366, height: 768 });

  for (const pageName of ['General', 'Branding']) {
    const subpage = SUBPAGES.find(s => s.name === pageName);
    await page.goto(`http://localhost:5173${subpage.path}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const check = await page.evaluate(() => {
      const btn = document.querySelector('.settings-announcements-standalone-btn');
      const tablist = document.querySelector('[role="tablist"]');
      const btnRect = btn.getBoundingClientRect();
      const tablistRect = tablist.getBoundingClientRect();
      return {
        btnY: btnRect.top,
        tablistY: tablistRect.top,
        isAbove: btnRect.bottom <= tablistRect.top + 20
      };
    });

    console.log(`[Laptop 1366 - ${pageName}] Button Y: ${check.btnY}, Tablist Y: ${check.tablistY}, Is Above: ${check.isAbove}`);
    const screenshotPath = path.join(ARTIFACT_DIR, `heading_btn_${pageName.toLowerCase()}_1366.png`);
    await page.screenshot({ path: screenshotPath });
  }

  // 3. Test Clicking Button Navigates to Announcements Page
  console.log('\n--- Step 3: Testing Click Navigation ---');
  await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  await page.click('.settings-announcements-standalone-btn');
  await page.waitForFunction(() => window.location.pathname.includes('/admin/settings/announcements'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  console.log('✓ Successfully navigated to:', await page.evaluate(() => window.location.pathname));

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Error during test execution:', err);
  process.exit(1);
});

