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

  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    return { token: data.accessToken, user: data.user };
  }
  return null;
}

async function main() {
  console.log('=== TEST SUITE: REPORTS DASHBOARD LATEST FIGMA UPDATE (NODE 20:5782) ===\n');

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

  console.log('Navigating to http://localhost:5173/admin/reports ...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const results = [];

  // ==========================================
  // 1. Top Navigation Verification
  // ==========================================
  console.log('[TEST 1] Verifying Top Navigation...');
  const topNavDetails = await page.evaluate(() => {
    const activeTab = document.querySelector('.reports-nav-tab.active')?.textContent?.trim();
    const otherTabs = Array.from(document.querySelectorAll('.reports-nav-tab:not(.active)')).map(t => t.textContent.trim());
    const hasSearchInput = !!document.querySelector('.reports-search-input');
    const hasSearchIconBtn = Array.from(document.querySelectorAll('.reports-icon-btn')).some(b => b.getAttribute('aria-label') === 'Search' || b.getAttribute('title') === 'Search');
    const hasNotificationDot = !!document.querySelector('.reports-notification-dot');
    const hasAvatar = !!document.querySelector('.reports-admin-avatar img');

    return {
      activeTab,
      otherTabs,
      hasSearchInput,
      hasSearchIconBtn,
      hasNotificationDot,
      hasAvatar
    };
  });

  console.log('Top Nav details:', topNavDetails);
  results.push({ test: 'Reports tab is active', passed: topNavDetails.activeTab === 'Reports' });
  results.push({ test: 'Analytics tab is present', passed: topNavDetails.otherTabs.includes('Analytics') });
  results.push({ test: 'Previous search input is REMOVED', passed: !topNavDetails.hasSearchInput });
  results.push({ test: 'Search icon button is PRESENT', passed: topNavDetails.hasSearchIconBtn });
  results.push({ test: 'Notification dot is PRESENT', passed: topNavDetails.hasNotificationDot });
  results.push({ test: 'Profile avatar is PRESENT', passed: topNavDetails.hasAvatar });

  // ==========================================
  // 2. Dashboard Filter Row Verification
  // ==========================================
  console.log('\n[TEST 2] Verifying Dashboard Filter Row...');
  const filterDetails = await page.evaluate(() => {
    const timeButtons = Array.from(document.querySelectorAll('.reports-time-btn')).map(b => b.textContent.trim());
    const dropdownLabels = Array.from(document.querySelectorAll('.reports-dropdown-label')).map(l => l.textContent.trim());
    const hasExportBtn = !!document.querySelector('.reports-export-btn');

    return {
      timeButtons,
      dropdownLabels,
      hasExportBtn
    };
  });

  console.log('Filter details:', filterDetails);
  results.push({ test: 'Time filters contain Today, 7D, 30D', passed: filterDetails.timeButtons.includes('Today') && filterDetails.timeButtons.includes('7D') && filterDetails.timeButtons.includes('30D') });
  results.push({ test: 'Hospital dropdown contains All Hospitals', passed: filterDetails.dropdownLabels.includes('All Hospitals') });
  results.push({ test: 'Department dropdown contains All Departments', passed: filterDetails.dropdownLabels.includes('All Departments') });
  results.push({ test: 'Export button is REMOVED from filter toolbar', passed: !filterDetails.hasExportBtn });

  // ==========================================
  // 3. Summary Metric Cards Verification
  // ==========================================
  console.log('\n[TEST 3] Verifying Summary Metric Cards...');
  const kpiCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.reports-kpi-card')).map(card => {
      const label = card.querySelector('.reports-kpi-label')?.textContent?.trim();
      const val = card.querySelector('.reports-kpi-value')?.textContent?.trim();
      const trend = card.querySelector('.reports-kpi-trend')?.textContent?.trim();
      const hasOverlay = !!card.querySelector('.reports-kpi-overlay');
      return { label, val, trend, hasOverlay };
    });
  });

  console.log('Summary KPI Cards:', kpiCards);
  results.push({ test: 'Exactly 4 summary KPI cards', passed: kpiCards.length === 4 });
  results.push({ test: 'Card 1: REGISTERED PATIENTS = 12,450', passed: kpiCards[0]?.label === 'REGISTERED PATIENTS' && kpiCards[0]?.val === '12,450' });
  results.push({ test: 'Card 2: REGISTERED DOCTORS = 842', passed: kpiCards[1]?.label === 'REGISTERED DOCTORS' && kpiCards[1]?.val === '842' });
  results.push({ test: 'Card 3: RECORDS UPLOADED = 45,912', passed: kpiCards[2]?.label === 'RECORDS UPLOADED' && kpiCards[2]?.val === '45,912' });
  results.push({ test: 'Card 4: PLATFORM AVAILABILITY = 99.98% (System Healthy)', passed: kpiCards[3]?.label === 'PLATFORM AVAILABILITY' && kpiCards[3]?.val === '99.98%' && kpiCards[3]?.trend === 'System Healthy' && kpiCards[3]?.hasOverlay });

  // ==========================================
  // 4. Report Navigation Buttons Verification (4 buttons)
  // ==========================================
  console.log('\n[TEST 4] Verifying 4 Report Navigation Buttons...');
  const actionCards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.reports-action-card')).map(btn => {
      const label = btn.querySelector('.reports-action-label')?.textContent?.trim();
      const bgColor = window.getComputedStyle(btn).backgroundColor;
      const color = window.getComputedStyle(btn).color;
      return { label, bgColor, color };
    });
  });

  console.log('Report Navigation Buttons:', actionCards);
  results.push({ test: 'Exactly 4 Report Navigation buttons', passed: actionCards.length === 4 });
  results.push({ test: 'Button 1: OCR Performance Report', passed: actionCards[0]?.label.includes('OCR Performance Report') });
  results.push({ test: 'Button 2: Clinical Reports', passed: actionCards[1]?.label.includes('Clinical Reports') });
  results.push({ test: 'Button 3: Referral Activity Report', passed: actionCards[2]?.label.includes('Referral Activity Report') });
  results.push({ test: 'Button 4: System health Report', passed: actionCards[3]?.label.includes('System health Report') });

  // Test Navigation of Button 1: OCR Performance Report
  console.log('\n[TEST 5] Testing Button 1 (OCR Performance Report) navigation...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.reports-action-card')).find(b => b.textContent.includes('OCR Performance Report'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const ocrUrl = page.url();
  console.log(`URL after clicking OCR Performance Report: ${ocrUrl}`);
  results.push({ test: 'OCR Performance Report navigates to /admin/reports/ocr-performance', passed: ocrUrl.includes('/admin/reports/ocr-performance') });

  // Go back to reports
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Test System health Report toast
  console.log('\n[TEST 6] Testing Button 4 (System health Report) click...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.reports-action-card')).find(b => b.textContent.includes('System health Report'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const hasToast = await page.evaluate(() => {
    return !!document.querySelector('[role="status"]');
  });
  console.log(`System health Report triggered feedback toast: ${hasToast}`);
  results.push({ test: 'System health Report button provides active feedback toast', passed: hasToast });

  // Capture screenshots
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/latest_reports_dashboard_desktop.png', fullPage: false });
  console.log('Saved screenshot: scratch/latest_reports_dashboard_desktop.png');

  await page.setViewport({ width: 1024, height: 768 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/latest_reports_dashboard_tablet.png', fullPage: false });
  console.log('Saved screenshot: scratch/latest_reports_dashboard_tablet.png');

  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scratch/latest_reports_dashboard_mobile.png', fullPage: false });
  console.log('Saved screenshot: scratch/latest_reports_dashboard_mobile.png');

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

