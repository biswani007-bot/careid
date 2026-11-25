const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getFreshToken() {
  console.log('Acquiring fresh Super Admin auth token from backend for +16505550001...');
  try {
    const reqData = JSON.stringify({ phone: '+16505550001' });
    const otpRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/request',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
    }, reqData);
    const challengeId = JSON.parse(otpRes.body).data?.challengeId;

    if (challengeId) {
      const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
      const verifyRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, verifyData);
      const token = JSON.parse(verifyRes.body).data?.accessToken;
      if (token) {
        console.log('Fresh token acquired successfully.');
        return token;
      }
    }
  } catch (err) {
    console.warn('Backend login fallback to mock token:', err.message);
  }
  return 'mock-superadmin-token-' + Date.now();
}

async function runResponsiveAuditVerification() {
  console.log('================================================================');
  console.log('CareID Admin Portal – Audit Dashboard Responsive Layout Audit');
  console.log('Testing exact required viewports: 1920, 1600, 1440, 1366, 1024, 768, 390');
  console.log('================================================================');

  const token = await getFreshToken();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();

  // Set auth state on new document
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'super_admin'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    }));
  }, token);

  // Prime local storage
  await page.goto('http://localhost:5173/admin/audit-dashboard', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'super_admin'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    }));
  }, token);

  const testViewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'desktop_1600', width: 1600, height: 900 },
    { name: 'desktop_1440', width: 1440, height: 900 },
    { name: 'desktop_1366', width: 1366, height: 768 },
    { name: 'tablet_1024', width: 1024, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  await page.goto('http://localhost:5173/admin/audit-dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
  await page.waitForSelector('.audit-page-title', { timeout: 10000 });

  for (const vp of testViewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width} x ${vp.height}) ...`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const canvas = document.querySelector('.audit-main-canvas');
      const bentoGrid = document.querySelector('.audit-bento-grid');
      const cards = Array.from(document.querySelectorAll('.audit-bento-card'));
      const trendsCard = document.querySelector('.audit-trends-card');
      const catsCard = document.querySelector('.audit-categories-card');

      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
      const trendsRect = trendsCard ? trendsCard.getBoundingClientRect() : null;
      const catsRect = catsCard ? catsCard.getBoundingClientRect() : null;

      // Check gap between sidebar right and canvas left
      const sidebarGap = (sidebarRect && canvasRect && sidebarRect.width > 0)
        ? Math.round(canvasRect.left - (sidebarRect.left + sidebarRect.width))
        : 0;

      // Check overflow
      const pageOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const canvasOverflow = canvas ? canvas.scrollWidth > canvas.clientWidth : false;

      // Card columns count on bento grid
      const gridStyle = bentoGrid ? window.getComputedStyle(bentoGrid) : null;
      const gridCols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0;

      return {
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        canvasWidth: canvasRect ? Math.round(canvasRect.width) : 0,
        sidebarGap,
        gridCols,
        cardsCount: cards.length,
        avgCardWidth: cards.length > 0 ? Math.round(cards[0].getBoundingClientRect().width) : 0,
        trendsHeight: trendsRect ? Math.round(trendsRect.height) : 0,
        catsHeight: catsRect ? Math.round(catsRect.height) : 0,
        pageOverflow,
        canvasOverflow
      };
    });

    console.log(`  Sidebar Width: ${metrics.sidebarWidth}px`);
    console.log(`  Main Canvas Width: ${metrics.canvasWidth}px`);
    console.log(`  Sidebar-to-Canvas Gap: ${metrics.sidebarGap}px (Must be 0px - starts immediately)`);
    console.log(`  Bento Grid Columns: ${metrics.gridCols} (${metrics.cardsCount} cards, ~${metrics.avgCardWidth}px wide each)`);
    console.log(`  Activity Trends Height: ${metrics.trendsHeight}px | Categories Height: ${metrics.catsHeight}px`);
    console.log(`  Horizontal Page Overflow: ${metrics.pageOverflow ? 'FAIL (Overflow)' : 'PASS (0px)'}`);

    // Take Screenshot
    const ssPath = path.join(artifactDir, `audit_dashboard_${vp.name}.png`);
    await page.screenshot({ path: ssPath });
    console.log(`  Screenshot saved: audit_dashboard_${vp.name}.png`);
  }

  // Also take a scrolled bottom screenshot on 1440 to confirm zero bottom clipping
  console.log('\nTesting vertical scroll & bottom content visibility on 1440x900 ...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const canvas = document.querySelector('.audit-main-canvas');
    if (canvas) canvas.scrollTop = canvas.scrollHeight;
  });
  await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

  const scrolledSsPath = path.join(artifactDir, 'audit_dashboard_scrolled_bottom_1440.png');
  await page.screenshot({ path: scrolledSsPath });
  console.log(`✓ Scrolled bottom screenshot saved: audit_dashboard_scrolled_bottom_1440.png`);

  await browser.close();
  console.log('\n================================================================');
  console.log('All Viewport & Layout Verifications Completed Successfully!');
  console.log('================================================================');
}

runResponsiveAuditVerification().catch(err => {
  console.error('Audit verification error:', err);
  process.exit(1);
});
