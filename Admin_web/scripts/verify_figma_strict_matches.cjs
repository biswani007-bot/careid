const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runFigmaStrictVerification() {
  console.log('🚀 Starting Strict Figma Design Matching & Verification for CareID Admin...');
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

  const results = {
    analytics: {},
    workspace: {},
    regressions: {},
    consoleErrors: [],
  };

  try {
    // =========================================================================
    // SECTION 1: OCR Analytics Dashboard (/admin/ocr/analytics) - Figma 20:3975
    // =========================================================================
    console.log('\n======================================================');
    console.log('TEST 1: Admin Portal — OCR Analytics Dashboard (Figma 20:3975)');
    console.log('======================================================');

    await page.goto(`${BASE_URL}/admin/ocr/analytics`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.ocr-analytics-wrapper', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));

    // 1.1 Breadcrumbs & Header
    const breadcrumbText = await page.$eval('.ocr-analytics-breadcrumb-row', (el) => el.innerText.trim());
    console.log('Breadcrumb:', breadcrumbText);

    const titleText = await page.$eval('.ocr-analytics-title', (el) => el.innerText.trim());
    console.log('Page Title:', titleText);

    const datePillText = await page.$eval('.ocr-date-pill-btn', (el) => el.innerText.trim());
    console.log('Date Filter Pill:', datePillText);

    const exportBtnText = await page.$eval('.ocr-export-report-btn', (el) => el.innerText.trim());
    console.log('Export Button:', exportBtnText);

    // 1.2 Top 5 KPI Cards
    const kpiCards = await page.$$eval('.ocr-kpi-bento-card', (cards) => {
      return cards.map((c) => {
        const label = c.querySelector('.ocr-kpi-card-label')?.innerText.trim();
        const value = c.querySelector('.ocr-kpi-card-value')?.innerText.trim();
        const trend = c.querySelector('.ocr-trend-pill')?.innerText.trim() || c.querySelector('.ocr-status-text-badge')?.innerText.trim();
        return { label, value, trend };
      });
    });
    console.log('KPI Cards Count:', kpiCards.length, JSON.stringify(kpiCards));

    // 1.3 Volume Chart
    const chartBars = await page.$$('.ocr-svg-chart-wrap svg g.cursor-pointer');
    console.log('Hourly Volume Chart Bars:', chartBars.length);

    // Test Chart Hover Interaction
    if (chartBars.length > 3) {
      await chartBars[3].hover();
      await new Promise((r) => setTimeout(r, 400));
      const hasTooltip = await page.$('.ocr-chart-hover-tooltip');
      console.log('Chart Hover Tooltip rendered:', !!hasTooltip);
    }

    // 1.4 Document Distribution
    const distItems = await page.$$eval('.ocr-dist-item', (items) => {
      return items.map((it) => ({
        name: it.querySelector('.ocr-dist-name')?.innerText.trim(),
        percent: it.querySelector('.ocr-dist-percent')?.innerText.trim(),
      }));
    });
    console.log('Document Distribution Items:', distItems.length, JSON.stringify(distItems));

    // 1.5 Recent Exceptions
    const exceptions = await page.$$eval('.ocr-exception-item', (items) => {
      return items.map((it) => ({
        title: it.querySelector('.ocr-exc-title')?.innerText.trim(),
        meta: it.querySelector('.ocr-exc-meta')?.innerText.trim(),
      }));
    });
    console.log('Recent Exceptions Items:', exceptions.length, JSON.stringify(exceptions));

    // Test Date Pill Click Interaction
    await page.click('#ocr-date-filter-btn');
    await new Promise((r) => setTimeout(r, 400));
    const updatedDatePill = await page.$eval('.ocr-date-pill-btn', (el) => el.innerText.trim());
    console.log('Date Pill toggled to:', updatedDatePill);

    // Test Export Button Click
    await page.click('#ocr-export-report-btn');
    await new Promise((r) => setTimeout(r, 400));

    // Take Desktop Screenshots of Analytics
    const analyticsDesktopPath = path.join(ARTIFACTS_DIR, 'figma_ocr_analytics_desktop_1440.png');
    await page.screenshot({ path: analyticsDesktopPath, fullPage: false });
    console.log('Saved screenshot:', analyticsDesktopPath);

    // 1280 Viewport
    await page.setViewport({ width: 1280, height: 1024 });
    await new Promise((r) => setTimeout(r, 400));
    const analytics1280Path = path.join(ARTIFACTS_DIR, 'figma_ocr_analytics_desktop_1280.png');
    await page.screenshot({ path: analytics1280Path, fullPage: false });
    console.log('Saved screenshot:', analytics1280Path);

    // Mobile Viewport
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise((r) => setTimeout(r, 400));
    const analyticsMobilePath = path.join(ARTIFACTS_DIR, 'figma_ocr_analytics_mobile_375.png');
    await page.screenshot({ path: analyticsMobilePath, fullPage: true });
    console.log('Saved mobile screenshot:', analyticsMobilePath);

    results.analytics = {
      breadcrumb: breadcrumbText,
      title: titleText,
      kpisCount: kpiCards.length,
      chartBarsCount: chartBars.length,
      distCount: distItems.length,
      exceptionsCount: exceptions.length,
      datePillInteractive: updatedDatePill !== datePillText,
    };

    // =========================================================================
    // SECTION 2: OCR Verification Workspace (/admin/ocr/verify/ocr-8821) - Figma 20:4292
    // =========================================================================
    console.log('\n======================================================');
    console.log('TEST 2: Admin Portal — OCR Verification Workspace (Figma 20:4292)');
    console.log('======================================================');

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.goto(`${BASE_URL}/admin/ocr/verify/ocr-8821`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.ocr-workspace-root', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));

    // 2.1 Workspace Header
    const taskIdText = await page.$eval('.ocr-workspace-task-id', (el) => el.innerText.trim());
    console.log('Workspace Task ID:', taskIdText);

    const docTitleText = await page.$eval('.ocr-workspace-title', (el) => el.innerText.trim());
    console.log('Document Title:', docTitleText);

    const actionButtons = await page.$$eval('.ocr-workspace-actions button', (btns) => {
      return btns.map((b) => b.innerText.trim());
    });
    console.log('Header Action Buttons:', JSON.stringify(actionButtons));

    // 2.2 Left Panel: Document Preview & Toolbar
    const zoomTextBefore = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    console.log('Initial Zoom Level:', zoomTextBefore);

    // Test Zoom In
    await page.click('#ocr-zoom-in-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomTextAfter = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    console.log('Zoom Level after Zoom In:', zoomTextAfter);

    // Test Reset Zoom
    await page.click('#ocr-reset-zoom-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomTextReset = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    console.log('Zoom Level after Reset:', zoomTextReset);

    // 2.3 Center Panel: Extracted Data Form
    const patientNameVal = await page.$eval('#patientName', (el) => el.value);
    const patientIdVal = await page.$eval('#patientId', (el) => el.value);
    const collectionDateVal = await page.$eval('#collectionDate', (el) => el.value);
    const providerVal = await page.$eval('#provider', (el) => el.value);
    console.log('Meta fields:', { patientNameVal, patientIdVal, collectionDateVal, providerVal });

    // Clinical Table Rows
    const clinicalRowsBefore = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    console.log('Clinical Table Rows count:', clinicalRowsBefore);

    // Test "Add Missing Row" button
    await page.click('#ocr-add-row-btn');
    await new Promise((r) => setTimeout(r, 400));
    const clinicalRowsAfter = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    console.log('Clinical Table Rows after Add:', clinicalRowsAfter);

    // 2.4 Right Panel: Analysis
    const globalConfidenceVal = await page.$eval('.ocr-circle-meter-text', (el) => el.innerText.trim());
    const globalConfidenceLabel = await page.$eval('.ocr-global-confidence-label', (el) => el.innerText.trim());
    console.log('Global Confidence:', globalConfidenceVal, globalConfidenceLabel);

    const alertCards = await page.$$eval('.ocr-alert-card', (cards) => {
      return cards.map((c) => ({
        title: c.querySelector('.ocr-alert-title')?.innerText.trim(),
        desc: c.querySelector('.ocr-alert-desc')?.innerText.trim(),
      }));
    });
    console.log('Alert Cards:', alertCards.length, JSON.stringify(alertCards));

    // 2.5 Test Reject Modal Dialog
    console.log('\nTesting Reject OCR Dialog...');
    await page.click('#ocr-reject-btn');
    await new Promise((r) => setTimeout(r, 400));
    const dialogOpen = await page.$('.ocr-dialog-backdrop');
    console.log('Reject Dialog opened:', !!dialogOpen);

    // Close Dialog with Cancel
    const cancelBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.ocr-dialog-card button'));
      return btns.find((b) => b.textContent && b.textContent.includes('Cancel'));
    });
    if (cancelBtn && cancelBtn.asElement()) {
      await cancelBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 400));
    }
    const dialogClosed = await page.$('.ocr-dialog-backdrop');
    console.log('Reject Dialog closed after Cancel:', dialogClosed === null);

    // Save Desktop Screenshots of Workspace
    const workspaceDesktopPath = path.join(ARTIFACTS_DIR, 'figma_ocr_workspace_desktop_1440.png');
    await page.screenshot({ path: workspaceDesktopPath, fullPage: false });
    console.log('Saved screenshot:', workspaceDesktopPath);

    // 1280 Viewport
    await page.setViewport({ width: 1280, height: 1024 });
    await new Promise((r) => setTimeout(r, 400));
    const workspace1280Path = path.join(ARTIFACTS_DIR, 'figma_ocr_workspace_desktop_1280.png');
    await page.screenshot({ path: workspace1280Path, fullPage: false });
    console.log('Saved screenshot:', workspace1280Path);

    // Mobile Viewport
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await new Promise((r) => setTimeout(r, 400));
    const workspaceMobilePath = path.join(ARTIFACTS_DIR, 'figma_ocr_workspace_mobile_375.png');
    await page.screenshot({ path: workspaceMobilePath, fullPage: true });
    console.log('Saved mobile screenshot:', workspaceMobilePath);

    results.workspace = {
      taskId: taskIdText,
      docTitle: docTitleText,
      actionButtons,
      zoomInteraction: zoomTextBefore !== zoomTextAfter && zoomTextReset === '100%',
      addRowInteraction: clinicalRowsAfter === clinicalRowsBefore + 1,
      rejectDialogInteraction: !!dialogOpen && dialogClosed === null,
      globalConfidence: globalConfidenceVal,
      alertsCount: alertCards.length,
    };

    // =========================================================================
    // SECTION 3: Regression Verification for Existing Routes
    // =========================================================================
    console.log('\n======================================================');
    console.log('TEST 3: Regression Check: OCR Queue & Health Records');
    console.log('======================================================');

    // 3.1 OCR Queue (/admin/ocr/queue)
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.ocr-queue-wrapper', { timeout: 10000 });
    const queueRows = await page.$$eval('.ocr-queue-table tbody tr', (rows) => rows.length);
    console.log('OCR Queue rendered rows:', queueRows);

    // 3.2 All Health Records (/admin/records)
    await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
    await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 10000 });
    const recordsRows = await page.$$eval('tbody tr', (rows) => rows.length);
    console.log('Health Records rendered rows:', recordsRows);

    results.regressions = {
      ocrQueueFunctional: queueRows > 0,
      healthRecordsFunctional: recordsRows > 0,
    };

    results.consoleErrors = consoleErrors;

    console.log('\n======================================================');
    console.log('FINAL VERIFICATION RESULTS:');
    console.log(JSON.stringify(results, null, 2));
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
  } finally {
    await browser.close();
  }
}

runFigmaStrictVerification();
