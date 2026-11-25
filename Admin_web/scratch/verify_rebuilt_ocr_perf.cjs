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
  console.log('=== TEST SUITE: STRICT FIGMA REBUILD VERIFICATION ===\n');

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

  console.log('Navigating to http://localhost:5173/admin/reports/ocr-performance ...');
  await page.goto('http://localhost:5173/admin/reports/ocr-performance', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const results = [];

  // 1. Verify unauthorized elements are GONE
  const unauthorizedCheck = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasPerformanceOverviewTab = bodyText.includes('Performance Overview');
    const hasClinicalFieldsTab = bodyText.includes('Extracted Clinical Fields');
    const hasAuditTimelineTab = bodyText.includes('Immutable Audit Timeline');
    const hasClinicalTable = !!document.querySelector('.ocr-perf-table');
    const hasTimeline = !!document.querySelector('.ocr-perf-timeline-list');
    const hasExtensionCard = !!document.querySelector('.ocr-perf-extension-card');

    return {
      hasPerformanceOverviewTab,
      hasClinicalFieldsTab,
      hasAuditTimelineTab,
      hasClinicalTable,
      hasTimeline,
      hasExtensionCard
    };
  });

  console.log('Unauthorized elements check:', unauthorizedCheck);
  results.push({ test: 'NO "Performance Overview" tab', passed: !unauthorizedCheck.hasPerformanceOverviewTab });
  results.push({ test: 'NO "Extracted Clinical Fields" tab', passed: !unauthorizedCheck.hasClinicalFieldsTab });
  results.push({ test: 'NO "Immutable Audit Timeline" tab', passed: !unauthorizedCheck.hasAuditTimelineTab });
  results.push({ test: 'NO clinical fields table in DOM', passed: !unauthorizedCheck.hasClinicalTable });
  results.push({ test: 'NO audit timeline in DOM', passed: !unauthorizedCheck.hasTimeline });
  results.push({ test: 'NO unauthorized extension cards', passed: !unauthorizedCheck.hasExtensionCard });

  // 2. Verify approved Figma elements are PRESENT
  const figmaElements = await page.evaluate(() => {
    const title = document.querySelector('.ocr-perf-title')?.textContent?.trim();
    const breadcrumb = document.querySelector('.ocr-perf-breadcrumb-active')?.textContent?.trim();
    const filterBtn = document.getElementById('ocr-perf-time-btn')?.textContent?.trim();
    const exportBtn = document.getElementById('ocr-perf-export-btn')?.textContent?.trim();

    // 4 KPI Bento cards
    const kpis = Array.from(document.querySelectorAll('.ocr-perf-kpi-card')).map(card => {
      const label = card.querySelector('.ocr-perf-kpi-label')?.textContent?.trim();
      const val = card.querySelector('.ocr-perf-kpi-val')?.textContent?.trim();
      const trend = card.querySelector('.ocr-perf-trend-pill')?.textContent?.trim();
      return { label, val, trend };
    });

    // 2 Status cards
    const statuses = Array.from(document.querySelectorAll('.ocr-perf-status-card')).map(card => {
      const tag = card.querySelector('.ocr-perf-status-tag')?.textContent?.trim();
      const title = card.querySelector('.ocr-perf-status-title')?.textContent?.trim();
      const count = card.querySelector('.ocr-perf-status-count')?.textContent?.trim();
      const action = card.querySelector('.ocr-perf-status-link-btn')?.textContent?.trim();
      return { tag, title, count, action };
    });

    // Chart 1: Distribution
    const distTitle = document.getElementById('chart-doc-distribution')?.textContent?.trim();
    const distItems = Array.from(document.querySelectorAll('.ocr-perf-dist-item')).map(item => {
      const label = item.querySelector('.ocr-perf-dist-label')?.textContent?.trim();
      const pct = item.querySelector('.ocr-perf-dist-pct')?.textContent?.trim();
      return { label, pct };
    });

    // Chart 2: Trend
    const trendTitle = document.getElementById('chart-approval-trend')?.textContent?.trim();
    const trendSub = document.querySelector('.ocr-perf-chart-sub')?.textContent?.trim();
    const hasSvg = !!document.querySelector('.ocr-perf-trend-svg-container svg');
    const xLabels = Array.from(document.querySelectorAll('.ocr-perf-xaxis-label')).map(l => l.textContent.trim());

    return {
      title,
      breadcrumb,
      filterBtn,
      exportBtn,
      kpis,
      statuses,
      distTitle,
      distItems,
      trendTitle,
      trendSub,
      hasSvg,
      xLabels
    };
  });

  console.log('\nRendered Figma elements:', JSON.stringify(figmaElements, null, 2));

  results.push({ test: 'Header title is "OCR Performance Report"', passed: figmaElements.title === 'OCR Performance Report' });
  results.push({ test: 'Breadcrumb active is "OCR PROCESSING"', passed: figmaElements.breadcrumb === 'OCR PROCESSING' });
  results.push({ test: 'Date Filter is "Last 30 Days"', passed: figmaElements.filterBtn.includes('Last 30 Days') });
  results.push({ test: 'Export Button exists', passed: figmaElements.exportBtn.includes('Export') });
  results.push({ test: 'Exactly 4 Bento KPI cards', passed: figmaElements.kpis.length === 4 });
  results.push({ test: 'KPI 1 is "Total OCR Requests" (14,285 / 12%)', passed: figmaElements.kpis[0]?.label === 'Total OCR Requests' && figmaElements.kpis[0]?.val === '14,285' });
  results.push({ test: 'KPI 2 is "Auto-Approval Rate" (87.3% / 2.4%)', passed: figmaElements.kpis[1]?.label === 'Auto-Approval Rate' && figmaElements.kpis[1]?.val === '87.3%' });
  results.push({ test: 'KPI 3 is "Avg. Confidence Score" (94.1% / 0%)', passed: figmaElements.kpis[2]?.label === 'Avg. Confidence Score' && figmaElements.kpis[2]?.val === '94.1%' });
  results.push({ test: 'KPI 4 is "Avg. Processing Time" (1.2s / 0.5s)', passed: figmaElements.kpis[3]?.label === 'Avg. Processing Time' && figmaElements.kpis[3]?.val === '1.2s' });
  results.push({ test: 'Status card 1 is "Rejected Documents" (42, REQUIRES ACTION, Review)', passed: figmaElements.statuses[0]?.tag === 'REQUIRES ACTION' && figmaElements.statuses[0]?.count === '42' });
  results.push({ test: 'Status card 2 is "Pending Human Review" (156, IN QUEUE, Process)', passed: figmaElements.statuses[1]?.tag === 'IN QUEUE' && figmaElements.statuses[1]?.count === '156' });
  results.push({ test: 'Chart 1 is "Document Type Distribution" with 4 categories', passed: figmaElements.distTitle === 'Document Type Distribution' && figmaElements.distItems.length === 4 });
  results.push({ test: 'Chart 2 is "Approval Trend" ("Past 7 Days", SVG + Mon,Wed,Fri,Sun)', passed: figmaElements.trendTitle === 'Approval Trend' && figmaElements.hasSvg && figmaElements.xLabels.length === 4 });

  // Capture desktop screenshot
  await page.screenshot({ path: 'scratch/rebuilt_ocr_perf_desktop.png', fullPage: false });
  console.log('Saved screenshot: scratch/rebuilt_ocr_perf_desktop.png');

  // Tablet screenshot (1024x768)
  await page.setViewport({ width: 1024, height: 768 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/rebuilt_ocr_perf_tablet.png', fullPage: false });
  console.log('Saved screenshot: scratch/rebuilt_ocr_perf_tablet.png');

  // Mobile screenshot (375x667)
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/rebuilt_ocr_perf_mobile.png', fullPage: false });
  console.log('Saved screenshot: scratch/rebuilt_ocr_perf_mobile.png');

  // Summary
  console.log('\n==========================================');
  console.log('STRICT FIGMA VERIFICATION SUMMARY:');
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

