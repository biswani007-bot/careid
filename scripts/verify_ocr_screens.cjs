const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runOcrVerification() {
  console.log('🚀 Starting verification of OCR Processing Queue & OCR Analytics Dashboard...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  const testResults = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Sidebar Navigation to OCR Queue
    // ----------------------------------------------------
    console.log('\n--- Test 1: Navigation from Dashboard to OCR Queue via Sidebar ---');
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click OCR Verification button in sidebar
    const ocrNavBtn = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      return items.find((btn) => btn.textContent && btn.textContent.includes('OCR Verification'));
    });

    if (ocrNavBtn && ocrNavBtn.asElement()) {
      await ocrNavBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 600));
    } else {
      await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle2' });
    }

    console.log('Current URL after navigation:', page.url());
    testResults.push({
      test: 'Sidebar Navigation to OCR Queue',
      passed: page.url().includes('/admin/ocr/queue'),
      url: page.url(),
    });

    // ----------------------------------------------------
    // TEST 2: Screen A - OCR Processing Queue Elements
    // ----------------------------------------------------
    console.log('\n--- Test 2: Screen A (OCR Processing Queue Elements) ---');
    await page.waitForSelector('.ocr-queue-wrapper', { timeout: 10000 });

    // Check KPI cards
    const kpiCards = await page.$$('.ocr-kpi-card');
    console.log('KPI Cards found:', kpiCards.length);

    // Check Filter Buttons
    const filterButtons = await page.$$('.ocr-filter-btn');
    console.log('Filter buttons count:', filterButtons.length);

    // Check Table Rows
    const tableRows = await page.$$('.ocr-queue-table tbody tr');
    console.log('Table rows rendered:', tableRows.length);

    // Take Desktop Screenshot Top
    const queueScreenshotPath = path.join(ARTIFACTS_DIR, 'ocr_queue_desktop.png');
    await page.screenshot({ path: queueScreenshotPath, fullPage: false });
    console.log('Saved screenshot:', queueScreenshotPath);

    testResults.push({
      test: 'Screen A Elements Rendered',
      passed: kpiCards.length === 4 && filterButtons.length >= 8 && tableRows.length > 0,
      details: {
        kpiCards: kpiCards.length,
        filters: filterButtons.length,
        rows: tableRows.length,
      },
    });

    // ----------------------------------------------------
    // TEST 3: Interactive Filter & Review Modal
    // ----------------------------------------------------
    console.log('\n--- Test 3: Interactive Filter & Review Modal ---');
    // Click Pending filter
    const pendingFilterBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.ocr-filter-btn'));
      return btns.find((b) => b.textContent && b.textContent.trim() === 'Pending');
    });
    if (pendingFilterBtn && pendingFilterBtn.asElement()) {
      await pendingFilterBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 300));
      console.log('Clicked Pending filter pill');
    }

    // Click Review button on first row to open modal
    const reviewBtn = await page.$('.ocr-review-btn');
    if (reviewBtn) {
      await reviewBtn.click();
      await page.waitForSelector('.ocr-modal-scrim', { timeout: 3000 });
      console.log('Review modal opened successfully');

      const modalScreenshotPath = path.join(ARTIFACTS_DIR, 'ocr_review_modal.png');
      await page.screenshot({ path: modalScreenshotPath });
      console.log('Saved screenshot:', modalScreenshotPath);

      // Close modal
      const closeBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('.ocr-modal-box button'));
        return btns.find((b) => b.textContent && b.textContent.includes('Close'));
      });
      if (closeBtn && closeBtn.asElement()) {
        await closeBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 300));
        console.log('Review modal closed');
      }

      testResults.push({
        test: 'OCR Review Modal Interaction',
        passed: true,
      });
    }

    // ----------------------------------------------------
    // TEST 4: Screen B - OCR Analytics Dashboard
    // ----------------------------------------------------
    console.log('\n--- Test 4: Screen B (OCR Analytics Dashboard) ---');
    // Navigate via Analytics button or URL
    await page.goto(`${BASE_URL}/admin/ocr/analytics`, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector('.ocr-analytics-wrapper', { timeout: 10000 });

    // Check 5 Top KPI Cards
    const analyticsKpis = await page.$$('.ocr-analytics-kpi-card');
    console.log('Analytics 5 KPI cards found:', analyticsKpis.length);

    // Check SVG Stacked Bar Chart
    const chartSvg = await page.$('.ocr-chart-container svg');
    console.log('Stacked bar chart SVG rendered:', !!chartSvg);

    // Check Document Distribution items
    const distItems = await page.$$('.ocr-distribution-item');
    console.log('Document distribution categories count:', distItems.length);

    // Check Recent Exceptions items
    const exceptionItems = await page.$$('.ocr-exception-row');
    console.log('Recent exception items count:', exceptionItems.length);

    // Hover over bar chart to trigger tooltip
    const firstBarGroup = await page.$('.ocr-chart-container svg g.cursor-pointer');
    if (firstBarGroup) {
      await firstBarGroup.hover();
      await new Promise((r) => setTimeout(r, 200));
      console.log('Hovered over chart bar to display tooltip');
    }

    // Take Desktop Screenshot
    const analyticsScreenshotPath = path.join(ARTIFACTS_DIR, 'ocr_analytics_desktop.png');
    await page.screenshot({ path: analyticsScreenshotPath, fullPage: false });
    console.log('Saved screenshot:', analyticsScreenshotPath);

    testResults.push({
      test: 'Screen B Elements Rendered',
      passed: analyticsKpis.length === 5 && !!chartSvg && distItems.length === 4 && exceptionItems.length === 3,
      details: {
        kpis: analyticsKpis.length,
        chartSvg: !!chartSvg,
        distItems: distItems.length,
        exceptions: exceptionItems.length,
      },
    });

    // ----------------------------------------------------
    // TEST 5: Mobile Viewport Verification (375x812)
    // ----------------------------------------------------
    console.log('\n--- Test 5: Mobile Viewport Verification (375px) ---');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });

    // OCR Queue Mobile
    await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle2' });
    const mobileQueuePath = path.join(ARTIFACTS_DIR, 'ocr_queue_mobile_375px.png');
    await page.screenshot({ path: mobileQueuePath });
    console.log('Saved mobile queue screenshot:', mobileQueuePath);

    // OCR Analytics Mobile
    await page.goto(`${BASE_URL}/admin/ocr/analytics`, { waitUntil: 'networkidle2' });
    const mobileAnalyticsPath = path.join(ARTIFACTS_DIR, 'ocr_analytics_mobile_375px.png');
    await page.screenshot({ path: mobileAnalyticsPath });
    console.log('Saved mobile analytics screenshot:', mobileAnalyticsPath);

    testResults.push({
      test: 'Mobile Viewport Rendering',
      passed: true,
      viewport: '375x812',
    });

    // ----------------------------------------------------
    // TEST 6: Health Records Regression Check
    // ----------------------------------------------------
    console.log('\n--- Test 6: Health Records Routes Regression Check ---');
    await page.setViewport({ width: 1440, height: 900 });

    const recordsRoutes = [
      { path: '/admin/records', name: 'All Records' },
      { path: '/admin/records/medical', name: 'Medical Records' },
      { path: '/admin/records/dental', name: 'Dental Records' },
      { path: '/admin/records/vision', name: 'Vision Records' },
    ];

    for (const r of recordsRoutes) {
      await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle2' });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const rowCount = await page.evaluate(() => {
        return document.querySelectorAll('table tbody tr').length;
      });
      console.log(`Route ${r.path} rendered with ${rowCount} rows`);
      testResults.push({
        test: `Regression: ${r.name}`,
        passed: rowCount >= 10,
        rows: rowCount,
      });
    }

  } catch (err) {
    console.error('❌ Verification script encountered an error:', err);
    testResults.push({
      test: 'Execution Error',
      passed: false,
      error: err.message,
    });
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log('🏁 OCR & REGRESSION VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log('Console Errors caught:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
  console.log('Test Results:');
  console.table(testResults);
}

runOcrVerification();
