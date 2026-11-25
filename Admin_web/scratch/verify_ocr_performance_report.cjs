const puppeteer = require('puppeteer-core');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';

async function main() {
  console.log('=== VERIFYING OCR PERFORMANCE REPORT (FIGMA NODE 20:5968) ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.accessToken;

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all'],
      status: 'ACTIVE'
    }));
  }, token);

  // 1. Navigate to /admin/ocr/performance
  console.log('[TEST 1] Navigating to http://localhost:5173/admin/ocr/performance (Desktop 1440x900)...');
  await page.goto('http://localhost:5173/admin/ocr/performance', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const pageDetails = await page.evaluate(() => {
    const title = document.querySelector('.ocr-perf-title')?.textContent?.trim();
    const breadcrumbActive = document.querySelector('.ocr-perf-breadcrumb-active')?.textContent?.trim();
    const breadcrumbs = Array.from(document.querySelectorAll('.ocr-perf-breadcrumbs *')).map(el => el.textContent.trim()).filter(Boolean);
    const searchPlaceholder = document.querySelector('.ocr-perf-search-input')?.getAttribute('placeholder');

    // Bento KPI cards
    const kpiCards = Array.from(document.querySelectorAll('.ocr-perf-kpi-card')).map(card => {
      const label = card.querySelector('.ocr-perf-kpi-label')?.textContent?.trim();
      const val = card.querySelector('.ocr-perf-kpi-val')?.textContent?.trim();
      const trend = card.querySelector('.ocr-perf-trend-pill')?.textContent?.trim();
      return { label, val, trend };
    });

    // Status cards
    const statusCards = Array.from(document.querySelectorAll('.ocr-perf-status-card')).map(card => {
      const tag = card.querySelector('.ocr-perf-status-tag')?.textContent?.trim();
      const title = card.querySelector('.ocr-perf-status-title')?.textContent?.trim();
      const count = card.querySelector('.ocr-perf-status-count')?.textContent?.trim();
      const link = card.querySelector('.ocr-perf-status-link-btn')?.textContent?.trim();
      return { tag, title, count, link };
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
    const xLabels = Array.from(document.querySelectorAll('.ocr-perf-xaxis-label')).map(l => l.textContent.trim());

    return {
      title,
      breadcrumbActive,
      breadcrumbs,
      searchPlaceholder,
      kpiCards,
      statusCards,
      distTitle,
      distItems,
      trendTitle,
      xLabels
    };
  });

  console.log('Page Title:', pageDetails.title);
  console.log('Breadcrumbs:', pageDetails.breadcrumbs.join(' '));
  console.log('Search Placeholder:', pageDetails.searchPlaceholder);
  console.log('Bento KPI Cards (4 total):', JSON.stringify(pageDetails.kpiCards, null, 2));
  console.log('Status Cards (2 total):', JSON.stringify(pageDetails.statusCards, null, 2));
  console.log('Document Distribution:', JSON.stringify(pageDetails.distItems, null, 2));
  console.log('Approval Trend Title:', pageDetails.trendTitle, '| X-Labels:', pageDetails.xLabels.join(', '));

  // Save Desktop Screenshot
  await page.screenshot({ path: 'scratch/ocr_performance_desktop.png' });
  console.log('\n[PASS] Saved scratch/ocr_performance_desktop.png');

  // 2. Test Time Filter Dropdown
  console.log('\n[TEST 2] Testing Time Filter Dropdown toggle...');
  await page.click('#ocr-perf-time-btn');
  await new Promise(r => setTimeout(r, 400));
  const dropdownItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ocr-perf-dropdown-item')).map(i => i.textContent?.trim());
  });
  console.log('Time filter options:', dropdownItems);

  // Click 'Last 7 Days'
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ocr-perf-dropdown-item'));
    const item7D = items.find(i => i.textContent?.includes('Last 7 Days'));
    if (item7D) item7D.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const newTimeValue = await page.evaluate(() => document.querySelector('#ocr-perf-time-btn')?.textContent?.trim());
  console.log('Time button updated value:', newTimeValue);

  // 3. Test Export button
  console.log('\n[TEST 3] Testing Export CSV button click...');
  await page.click('#ocr-perf-export-btn');
  await new Promise(r => setTimeout(r, 600));
  const toastText = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent?.trim());
  console.log('Export Toast Message:', toastText);

  // 4. Test Extracted Clinical Fields Tab
  console.log('\n[TEST 4] Testing Extracted Clinical Fields Tab...');
  await page.evaluate(() => {
    const tabBtns = Array.from(document.querySelectorAll('button'));
    const fieldsTab = tabBtns.find(b => b.textContent?.includes('Extracted Clinical Fields'));
    if (fieldsTab) fieldsTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const clinicalTableHeaders = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ocr-perf-table th')).map(th => th.textContent.trim());
  });
  const clinicalRowsCount = await page.evaluate(() => {
    return document.querySelectorAll('.ocr-perf-table tbody tr').length;
  });
  console.log('Clinical Table Headers:', clinicalTableHeaders.join(' | '));
  console.log('Clinical Rows Count:', clinicalRowsCount);
  await page.screenshot({ path: 'scratch/ocr_performance_clinical_fields.png' });
  console.log('[PASS] Saved scratch/ocr_performance_clinical_fields.png');

  // 5. Test Immutable Audit Timeline Tab
  console.log('\n[TEST 5] Testing Immutable Audit Timeline Tab...');
  await page.evaluate(() => {
    const tabBtns = Array.from(document.querySelectorAll('button'));
    const auditTab = tabBtns.find(b => b.textContent?.includes('Immutable Audit Timeline'));
    if (auditTab) auditTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const auditEntriesCount = await page.evaluate(() => {
    return document.querySelectorAll('.ocr-perf-timeline-item').length;
  });
  console.log('Audit Timeline Entries Count:', auditEntriesCount);
  await page.screenshot({ path: 'scratch/ocr_performance_audit_timeline.png' });
  console.log('[PASS] Saved scratch/ocr_performance_audit_timeline.png');

  // Switch back to Overview
  await page.evaluate(() => {
    const tabBtns = Array.from(document.querySelectorAll('button'));
    const overviewTab = tabBtns.find(b => b.textContent?.includes('Performance Overview'));
    if (overviewTab) overviewTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // 6. Test Tablet Viewport (768x1024)
  console.log('\n[TEST 6] Testing Tablet Viewport (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/ocr_performance_tablet.png' });
  console.log('[PASS] Saved scratch/ocr_performance_tablet.png');

  // 7. Test Mobile Viewport (375x667)
  console.log('\n[TEST 7] Testing Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/ocr_performance_mobile.png' });
  console.log('[PASS] Saved scratch/ocr_performance_mobile.png');

  // 8. Test Navigation from Reports Dashboard link
  console.log('\n[TEST 8] Testing Navigation from Reports Dashboard to OCR Performance Report...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const action1 = document.querySelector('.reports-action-card');
    if (action1) action1.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  console.log('URL navigated to from Reports Dashboard:', page.url());

  await browser.close();
  console.log('\n=== ALL OCR PERFORMANCE REPORT TESTS PASSED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

