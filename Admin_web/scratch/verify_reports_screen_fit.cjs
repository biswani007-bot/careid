const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function main() {
  console.log('=== VERIFYING REPORTS DASHBOARD SCREEN FIT & RESPONSIVENESS ===\n');

  if (!fs.existsSync(TOKEN_CACHE_FILE)) {
    console.error('Token cache file missing at', TOKEN_CACHE_FILE);
    process.exit(1);
  }
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set auth state
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles'],
      status: 'ACTIVE'
    }));
  }, tokenData.accessToken);

  const viewports = [
    { name: '1920x1080 (FHD)', width: 1920, height: 1080, shot: 'reports_fit_1920x1080.png', isDesktop: true },
    { name: '1600x900 (HD+)', width: 1600, height: 900, shot: 'reports_fit_1600x900.png', isDesktop: true },
    { name: '1366x768 (WXGA)', width: 1366, height: 768, shot: 'reports_fit_1366x768.png', isDesktop: true },
    { name: '1280x720 (HD)', width: 1280, height: 720, shot: 'reports_fit_1280x720.png', isDesktop: true },
    { name: '1024x768 (Tablet)', width: 1024, height: 768, shot: 'reports_fit_1024x768.png', isDesktop: false },
    { name: '375x667 (Mobile)', width: 375, height: 667, shot: 'reports_fit_375x667.png', isDesktop: false },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.reports-canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    const metrics = await page.evaluate((isDesktop) => {
      const sidebar = document.querySelector('aside.careid-sidebar, aside');
      const mainWrapper = document.querySelector('.reports-main-layout, .reports-main-wrapper');
      const canvas = document.querySelector('.reports-canvas');
      const bentoGrid = document.querySelector('.reports-bento-grid');
      const kpiCards = Array.from(document.querySelectorAll('.reports-kpi-card'));
      const actionsGrid = document.querySelector('.reports-actions-grid');
      const actionCards = Array.from(document.querySelectorAll('.reports-action-card'));

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const mainRect = mainWrapper ? mainWrapper.getBoundingClientRect() : null;
      const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
      const bentoRect = bentoGrid ? bentoGrid.getBoundingClientRect() : null;
      const actionsRect = actionsGrid ? actionsGrid.getBoundingClientRect() : null;

      const kpiWidths = kpiCards.map(c => Math.round(c.getBoundingClientRect().width));
      const actionWidths = actionCards.map(c => Math.round(c.getBoundingClientRect().width));

      const hasHorizontalScroll = document.documentElement.scrollWidth > windowWidth || (canvas && canvas.scrollWidth > canvas.clientWidth);

      // Blank space on right: distance from canvas right to window right
      const rightBlankSpace = canvasRect ? Math.round(windowWidth - canvasRect.right) : 0;
      // Distance from sidebar right to canvas left
      const leftGap = (sidebarRect && canvasRect && isDesktop) ? Math.round(canvasRect.left - sidebarRect.right) : 0;

      return {
        windowWidth,
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        mainWidth: mainRect ? Math.round(mainRect.width) : 0,
        canvasWidth: canvasRect ? Math.round(canvasRect.width) : 0,
        bentoWidth: bentoRect ? Math.round(bentoRect.width) : 0,
        actionsWidth: actionsRect ? Math.round(actionsRect.width) : 0,
        kpiCount: kpiCards.length,
        kpiWidths,
        actionCount: actionCards.length,
        actionWidths,
        rightBlankSpace,
        leftGap,
        hasHorizontalScroll
      };
    }, vp.isDesktop);

    const shotPath = path.join(ARTIFACT_DIR, vp.shot);
    await page.screenshot({ path: shotPath, fullPage: false });

    console.log(`- Window Width: ${metrics.windowWidth}px`);
    console.log(`- Sidebar Width: ${metrics.sidebarWidth}px`);
    console.log(`- Main Wrapper Width: ${metrics.mainWidth}px`);
    console.log(`- Canvas Width: ${metrics.canvasWidth}px`);
    console.log(`- Bento Grid Width: ${metrics.bentoWidth}px`);
    console.log(`- Actions Grid Width: ${metrics.actionsWidth}px`);
    console.log(`- KPI Card Widths: ${metrics.kpiWidths.join(', ')} px`);
    console.log(`- Action Button Widths: ${metrics.actionWidths.join(', ')} px`);
    console.log(`- Right Blank Space: ${metrics.rightBlankSpace}px (expected: 0px)`);
    console.log(`- Left Gap from Sidebar: ${metrics.leftGap}px (expected: 0px)`);
    console.log(`- Horizontal Scroll: ${metrics.hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);

    results.push({
      viewport: vp.name,
      ...metrics,
      screenshot: vp.shot
    });
  }

  await browser.close();

  console.log('\n=== SUMMARY RESULTS ===');
  console.table(results.map(r => ({
    Viewport: r.viewport,
    'Window W': r.windowWidth,
    'Sidebar W': r.sidebarWidth,
    'Canvas W': r.canvasWidth,
    'Right Blank': `${r.rightBlankSpace}px`,
    'Bento W': r.bentoWidth,
    'Actions W': r.actionsWidth,
    'Horiz Scroll': r.hasHorizontalScroll ? 'FAIL' : 'PASS'
  })));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
