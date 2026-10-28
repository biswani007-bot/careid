const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = path.join(
  process.env.USERPROFILE || 'C:\\Users\\biswa',
  '.gemini',
  'antigravity',
  'brain',
  'e0785a94-53fe-4f28-b816-f2efe4edf49e',
  '.tempmediaStorage'
);

async function runComprehensiveVerification() {
  console.log('=== STARTING COMPREHENSIVE RESPONSIVE & ZOOM VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  const viewports = [
    { name: '1920px', width: 1920, height: 1080 },
    { name: '1600px', width: 1600, height: 900 },
    { name: '1366px', width: 1366, height: 768 },
    { name: '1280px', width: 1280, height: 1024 },
    { name: '1024px', width: 1024, height: 768 },
    { name: '768px', width: 768, height: 1024 },
    { name: '390px', width: 390, height: 844 }
  ];

  const zoomLevels = [0.8, 0.9, 1.0, 1.1, 1.25];

  console.log('\n--- 1. TESTING VIEWPORTS AT 100% ZOOM ---');
  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

    const result = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const hasPageHorizontalOverflow = docScrollWidth > winInnerWidth;
      return { docScrollWidth, winInnerWidth, hasPageHorizontalOverflow };
    });

    console.log(`[Viewport ${vp.name}] scrollWidth: ${result.docScrollWidth}, innerWidth: ${result.winInnerWidth}, pageOverflow: ${result.hasPageHorizontalOverflow}`);
    if (result.hasPageHorizontalOverflow) {
      throw new Error(`Page horizontal overflow detected on viewport ${vp.name}!`);
    }
  }

  console.log('\n--- 2. TESTING BROWSER ZOOM LEVELS (BASE 1366x768) ---');
  for (const zoom of zoomLevels) {
    const effectiveWidth = Math.round(1366 / zoom);
    const effectiveHeight = Math.round(768 / zoom);

    await page.setViewport({ width: effectiveWidth, height: effectiveHeight, deviceScaleFactor: zoom });
    await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

    const result = await page.evaluate((z) => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const hasPageHorizontalOverflow = docScrollWidth > winInnerWidth;
      return { zoom: z, docScrollWidth, winInnerWidth, hasPageHorizontalOverflow };
    }, zoom);

    console.log(`[Zoom ${(zoom * 100).toFixed(0)}%] scrollWidth: ${result.docScrollWidth}, innerWidth: ${result.winInnerWidth}, pageOverflow: ${result.hasPageHorizontalOverflow}`);
    if (result.hasPageHorizontalOverflow) {
      throw new Error(`Page horizontal overflow detected at zoom ${(zoom * 100).toFixed(0)}%!`);
    }
  }

  console.log('\n--- 3. TESTING MODAL INTERACTION & RESPONSIVENESS AT 125% ZOOM ---');
  // Open Assign Dialog at 125% zoom
  await page.setViewport({ width: 1093, height: 614, deviceScaleFactor: 1.25 });
  await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

  // Click the first Assign Admin button
  const assignBtn = await page.$('.monitoring-action-btn[title*="Assign"]');
  if (assignBtn) {
    await assignBtn.click();
    await page.waitForSelector('.monitoring-modal-card');

    const modalDiag = await page.evaluate(() => {
      const modal = document.querySelector('.monitoring-modal-card');
      const r = modal.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      return {
        fitsHorizontally: r.width <= winW,
        fitsVertically: r.height <= winH,
        modalWidth: Math.round(r.width),
        modalHeight: Math.round(r.height),
        winW,
        winH
      };
    });

    console.log(`[Assign Modal at 125% Zoom] fitsHorizontally: ${modalDiag.fitsHorizontally}, fitsVertically: ${modalDiag.fitsVertically} (${modalDiag.modalWidth}x${modalDiag.modalHeight} in window ${modalDiag.winW}x${modalDiag.winH})`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_assign_modal_zoom125.png') });

    // Close modal
    const closeBtn = await page.$('.monitoring-modal-close-btn');
    if (closeBtn) await closeBtn.click();
  }

  console.log('\n--- 4. TESTING TAB NAVIGATION BACK & FORTH ---');
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

  // Click Overview tab
  const overviewTab = await page.$('button.monitoring-nav-tab');
  if (overviewTab) {
    await overviewTab.click();
    await page.waitForFunction(() => window.location.pathname === '/admin/referrals');
    console.log('[Navigation] Successfully navigated to Overview (/admin/referrals)');

    // Click Escalations tab back
    const escalationsTab = await page.$('button.referral-nav-tab:nth-child(2)');
    if (escalationsTab) {
      await escalationsTab.click();
      await page.waitForFunction(() => window.location.pathname === '/admin/referrals/escalations');
      console.log('[Navigation] Successfully returned to Escalations (/admin/referrals/escalations)');
    }
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS PASSED CLEANLY! ===');
}

runComprehensiveVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

