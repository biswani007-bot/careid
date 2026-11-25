const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFreshToken } = require('./get_fresh_token.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

const viewports = [
  { width: 1920, height: 1080, name: 'user_profile_1920x1080', desc: 'Full HD Desktop' },
  { width: 1440, height: 900, name: 'user_profile_1440x900', desc: 'Standard Desktop' },
  { width: 1366, height: 768, name: 'user_profile_1366x768', desc: 'Common Laptop' },
  { width: 1280, height: 800, name: 'user_profile_1280x800', desc: 'Small Laptop' },
  { width: 1024, height: 768, name: 'user_profile_1024x768', desc: 'Compact / Tablet Landscape' },
  { width: 768, height: 1024, name: 'user_profile_768x1024', desc: 'Tablet Portrait' },
  { width: 390, height: 844, name: 'user_profile_390x844', desc: 'Standard Mobile (iPhone 14)' },
  { width: 375, height: 812, name: 'user_profile_375x812', desc: 'Small Mobile (iPhone SE/Mini)' }
];

(async () => {
  console.log('Fetching fresh auth token...');
  await getFreshToken();
  const cachedToken = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Pre-seed auth session
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'domcontentloaded' });
  await page.evaluate((authData) => {
    localStorage.setItem('careid_access_token', authData.accessToken);
    localStorage.setItem('careid_refresh_token', authData.refreshToken);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: authData.user.id,
      phone: authData.user.phone,
      roles: authData.user.roles,
      status: authData.user.status,
      permissions: authData.user.permissions,
      name: 'Super Admin',
      email: 'admin@careid.test'
    }));
  }, cachedToken);

  const results = [];

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.width}x${vp.height} (${vp.desc})...`);
    await page.setViewport({ width: vp.width, height: vp.height });

    const targetUrl = 'http://localhost:5173/admin/users/bc6f6875-434c-4050-b893-07343cc27986';
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const main = document.querySelector('.user-details-main');
      const header = document.querySelector('.user-details-header');
      const card = document.querySelector('.user-details-profile-card');
      const container = document.querySelector('.user-details-container');

      const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const mRect = main ? main.getBoundingClientRect() : null;
      const hRect = header ? header.getBoundingClientRect() : null;
      const cRect = card ? card.getBoundingClientRect() : null;
      const contRect = container ? container.getBoundingClientRect() : null;

      const hasHorizScroll = document.documentElement.scrollWidth > window.innerWidth ||
                             document.body.scrollWidth > window.innerWidth;

      return {
        sidebarRight: sRect ? sRect.right : 0,
        mainLeft: mRect ? mRect.left : 0,
        mainWidth: mRect ? mRect.width : 0,
        headerLeft: hRect ? hRect.left : 0,
        cardLeft: cRect ? cRect.left : 0,
        cardWidth: cRect ? cRect.width : 0,
        containerLeft: contRect ? contRect.left : 0,
        containerWidth: contRect ? contRect.width : 0,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasHorizScroll,
        scrollWidth: document.documentElement.scrollWidth
      };
    });

    const isDesktop = vp.width >= 1024;
    // Overlap check: on desktop, cardLeft >= sidebarRight. On mobile, sidebar is hidden/collapsed offscreen (sidebarRight <= 0).
    const noOverlap = isDesktop
      ? (metrics.mainLeft >= metrics.sidebarRight - 1 && metrics.cardLeft >= metrics.sidebarRight - 1)
      : (metrics.sidebarRight <= 0 || metrics.mainLeft === 0);

    const screenshotPath = path.join(ARTIFACT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const row = {
      viewport: `${vp.width}x${vp.height}`,
      desc: vp.desc,
      sidebarRight: metrics.sidebarRight,
      mainLeft: metrics.mainLeft,
      cardLeft: metrics.cardLeft,
      cardWidth: metrics.cardWidth,
      noOverlap,
      hasHorizScroll: metrics.hasHorizScroll,
      screenshot: `${vp.name}.png`
    };
    results.push(row);
    console.log(`Result: sidebarRight=${metrics.sidebarRight}px, mainLeft=${metrics.mainLeft}px, cardLeft=${metrics.cardLeft}px, overlapFree=${noOverlap}, horizScroll=${metrics.hasHorizScroll}`);
    console.log(`Saved screenshot: ${screenshotPath}`);
  }

  await browser.close();

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.table(results);
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }

  fs.writeFileSync('scratch/verification_results.json', JSON.stringify(results, null, 2));
})();

