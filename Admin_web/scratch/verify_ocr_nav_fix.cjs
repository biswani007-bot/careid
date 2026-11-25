const puppeteer = require('puppeteer-core');
const fs = require('fs');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';

function reqHttps(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getAdminToken() {
  console.log('Obtaining fresh Super Admin token for +16505550001...');
  try {
    const phone = '+16505550001';
    const reqData = JSON.stringify({ phone });
    const otpRes = await reqHttps({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/request',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
    }, reqData);

    const otpJson = JSON.parse(otpRes.body);
    const challengeId = otpJson.data?.challengeId || otpJson.challengeId;

    if (challengeId) {
      const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
      const verifyRes = await reqHttps({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, verifyData);

      const verifyJson = JSON.parse(verifyRes.body);
      const token = verifyJson.data?.accessToken;
      const user = verifyJson.data?.user;
      if (token) {
        console.log('Successfully obtained fresh token!');
        fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ accessToken: token, user, time: Date.now() }));
        return { token, user };
      }
    }
  } catch (err) {
    console.error('Failed to get token via API:', err);
  }

  // Fallback to cache if request fails
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    return { token: data.accessToken, user: data.user };
  }
  return null;
}

async function main() {
  console.log('=== TEST SUITE: OCR PERFORMANCE REPORT NAVIGATION FIX ===\n');

  const auth = await getAdminToken();
  if (!auth || !auth.token) {
    console.error('Could not authenticate');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

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
  }, auth.token);

  const results = [];

  // ==========================================
  // TEST 1: Open /admin/reports and find OCR Performance Report action card
  // ==========================================
  console.log('[TEST 1] Navigating to Reports Dashboard: http://localhost:5173/admin/reports ...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const currentUrl1 = page.url();
  console.log(`Current URL: ${currentUrl1}`);
  results.push({ test: 'Reports Dashboard Loaded', passed: currentUrl1.includes('/admin/reports') });

  // Check action card existence
  const actionCardText = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.reports-action-card'));
    return cards.map(c => c.textContent.trim());
  });
  console.log('Action cards found on Reports Dashboard:', actionCardText);
  const hasOcrPerfCard = actionCardText.some(t => t.includes('OCR Performance Report'));
  results.push({ test: 'OCR Performance Report card exists', passed: hasOcrPerfCard });

  // ==========================================
  // TEST 2: Click OCR Performance Report action card
  // ==========================================
  console.log('\n[TEST 2] Clicking OCR Performance Report action card...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.reports-action-card'));
    const ocrCard = cards.find(c => c.textContent.includes('OCR Performance Report'));
    if (ocrCard) ocrCard.click();
  });

  await new Promise(r => setTimeout(r, 1500));
  const destinationUrl = page.url();
  console.log(`Destination URL after click: ${destinationUrl}`);

  const isNotAnalytics = !destinationUrl.includes('/admin/ocr/analytics');
  const isReportsOcrPerf = destinationUrl.includes('/admin/reports/ocr-performance');
  results.push({ test: 'Does NOT redirect to /admin/ocr/analytics', passed: isNotAnalytics });
  results.push({ test: 'Navigates to canonical /admin/reports/ocr-performance', passed: isReportsOcrPerf });

  // Verify OCR Performance Report screen elements render
  const reportDetails = await page.evaluate(() => {
    const title = document.querySelector('.ocr-perf-title')?.textContent?.trim();
    const breadcrumbActive = document.querySelector('.ocr-perf-breadcrumb-active')?.textContent?.trim();
    const breadcrumbItems = Array.from(document.querySelectorAll('.ocr-perf-breadcrumbs button, .ocr-perf-breadcrumbs span')).map(e => e.textContent.trim());
    const kpiCount = document.querySelectorAll('.ocr-perf-kpi-card').length;
    const statusCardCount = document.querySelectorAll('.ocr-perf-status-card').length;
    const activeSidebarNav = document.querySelector('.sidebar-nav-item.active .sidebar-nav-label')?.textContent?.trim();

    return {
      title,
      breadcrumbActive,
      breadcrumbItems,
      kpiCount,
      statusCardCount,
      activeSidebarNav
    };
  });

  console.log('Report screen details:', reportDetails);
  results.push({ test: 'Title is OCR Performance Report', passed: reportDetails.title === 'OCR Performance Report' });
  results.push({ test: 'Active breadcrumb is OCR PROCESSING', passed: reportDetails.breadcrumbActive === 'OCR PROCESSING' });
  results.push({ test: 'KPI cards rendered (4 expected)', passed: reportDetails.kpiCount === 4 });
  results.push({ test: 'Status cards rendered (2 expected)', passed: reportDetails.statusCardCount === 2 });
  results.push({ test: 'Sidebar active navigation is Reports', passed: reportDetails.activeSidebarNav === 'Reports' });

  // Capture screenshot of destination
  await page.screenshot({ path: 'scratch/test2_nav_ocr_performance.png', fullPage: false });
  console.log('Screenshot saved: scratch/test2_nav_ocr_performance.png');

  // ==========================================
  // TEST 3: Click "REPORTS" breadcrumb to navigate back
  // ==========================================
  console.log('\n[TEST 3] Testing Breadcrumb navigation back to Reports...');
  await page.evaluate(() => {
    const bcBtn = document.querySelector('.ocr-perf-breadcrumb-item');
    if (bcBtn) bcBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const backUrl = page.url();
  console.log(`URL after clicking REPORTS breadcrumb: ${backUrl}`);
  results.push({ test: 'Breadcrumb returns to /admin/reports', passed: backUrl.endsWith('/admin/reports') });

  // ==========================================
  // TEST 4: Direct URL access & Refresh /admin/reports/ocr-performance
  // ==========================================
  console.log('\n[TEST 4] Direct deep-link navigation and page reload on /admin/reports/ocr-performance...');
  await page.goto('http://localhost:5173/admin/reports/ocr-performance', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  const directUrl = page.url();
  console.log(`Direct URL: ${directUrl}`);

  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  const reloadUrl = page.url();
  console.log(`Reload URL: ${reloadUrl}`);

  const stillPerfReport = await page.evaluate(() => {
    return document.querySelector('.ocr-perf-title')?.textContent?.trim() === 'OCR Performance Report';
  });
  results.push({ test: 'Direct navigation stays on canonical route', passed: directUrl.includes('/admin/reports/ocr-performance') });
  results.push({ test: 'Page reload retains canonical route and renders view', passed: reloadUrl.includes('/admin/reports/ocr-performance') && stillPerfReport });

  // ==========================================
  // TEST 5: Verify route aliases redirect to canonical route
  // ==========================================
  console.log('\n[TEST 5] Testing route aliases...');
  const aliases = [
    '/admin/ocr/performance',
    '/admin/ocr/performance-report',
    '/admin/ocr/report',
    '/admin/reports/ocr',
    '/reports/ocr-performance'
  ];

  for (const alias of aliases) {
    await page.goto(`http://localhost:5173${alias}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));
    const aliasDest = page.url();
    const passed = aliasDest.includes('/admin/reports/ocr-performance');
    console.log(`Alias "${alias}" -> "${aliasDest}" (${passed ? 'PASS' : 'FAIL'})`);
    results.push({ test: `Alias ${alias} -> canonical route`, passed });
  }

  // ==========================================
  // TEST 6: Verify /admin/ocr/analytics STILL renders original OCR Analytics Dashboard
  // ==========================================
  console.log('\n[TEST 6] Verifying independent OCR Analytics Dashboard (/admin/ocr/analytics)...');
  await page.goto('http://localhost:5173/admin/ocr/analytics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const analyticsUrl = page.url();
  const analyticsDetails = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasAnalyticsHeading = text.includes('OCR Analytics') || text.includes('Analytics Dashboard') || text.includes('Processing Queue');
    const isPerfReport = !!document.querySelector('.ocr-perf-wrapper');
    return { hasAnalyticsHeading, isPerfReport };
  });

  console.log(`Analytics URL: ${analyticsUrl}`);
  console.log(`Analytics screen details: hasHeading=${analyticsDetails.hasAnalyticsHeading}, isPerfReport=${analyticsDetails.isPerfReport}`);
  const analyticsPassed = analyticsUrl.includes('/admin/ocr/analytics') && !analyticsDetails.isPerfReport;
  results.push({ test: '/admin/ocr/analytics operates independently (no regression)', passed: analyticsPassed });

  // ==========================================
  // TEST 7: Browser Back and Forward History
  // ==========================================
  console.log('\n[TEST 7] Testing browser history back and forward navigation...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Click card to go to ocr-performance
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.reports-action-card'));
    const ocrCard = cards.find(c => c.textContent.includes('OCR Performance Report'));
    if (ocrCard) ocrCard.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const historyStep1 = page.url();

  // Go back
  await page.goBack();
  await new Promise(r => setTimeout(r, 1000));
  const historyBack = page.url();

  // Go forward
  await page.goForward();
  await new Promise(r => setTimeout(r, 1000));
  const historyForward = page.url();

  console.log(`Navigated to: ${historyStep1}`);
  console.log(`Back: ${historyBack}`);
  console.log(`Forward: ${historyForward}`);

  const historyPassed = historyBack.includes('/admin/reports') && historyForward.includes('/admin/reports/ocr-performance');
  results.push({ test: 'Browser back/forward history navigation works smoothly', passed: historyPassed });

  // Summary
  console.log('\n==========================================');
  console.log('RESULTS SUMMARY:');
  console.log('==========================================');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`${icon} : ${r.test}`);
    if (!r.passed) allPassed = false;
  }

  await browser.close();
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
