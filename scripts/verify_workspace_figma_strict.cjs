const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyWorkspaceFigmaStrict() {
  console.log('🚀 Verifying OCR Verification Workspace against Figma Node 20:4292 (1280x1024)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // Exact Figma Frame Viewport: 1280 x 1024
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  const results = {};

  try {
    // ------------------------------------------------------------------------
    // TEST 1: OCR Verification Workspace (1280 x 1024)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Loading Workspace at 1280 x 1024 ---');
    await page.goto(`${BASE_URL}/admin/ocr/verify/ocr-8821`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.ocr-workspace-root', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Panel Dimensions
    const panelLayout = await page.evaluate(() => {
      const leftPanel = document.querySelector('.ocr-panel-doc');
      const centerPanel = document.querySelector('.ocr-panel-extracted');
      const rightPanel = document.querySelector('.ocr-panel-analysis');
      const docPaper = document.querySelector('.ocr-doc-paper');

      return {
        leftWidth: leftPanel?.getBoundingClientRect().width,
        centerWidth: centerPanel?.getBoundingClientRect().width,
        rightWidth: rightPanel?.getBoundingClientRect().width,
        paperWidth: docPaper?.getBoundingClientRect().width,
      };
    });
    console.log('Panel Layout Dimensions:', panelLayout);

    // Verify Header Elements
    const taskId = await page.$eval('.ocr-workspace-task-id', (el) => el.innerText.trim());
    const docTitle = await page.$eval('.ocr-workspace-title', (el) => el.innerText.trim());
    const actionButtons = await page.$$eval('.ocr-workspace-actions button', (btns) => btns.map((b) => b.innerText.trim()));
    console.log('Task ID:', taskId);
    console.log('Doc Title:', docTitle);
    console.log('Action Buttons:', actionButtons);

    // Test Zoom in left panel
    const zoomBefore = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    await page.click('#ocr-zoom-in-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomAfter = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    await page.click('#ocr-reset-zoom-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomReset = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText.trim());
    console.log(`Zoom test: ${zoomBefore} -> ${zoomAfter} -> ${zoomReset}`);

    // Verify Center Panel Form & Table
    const metaFields = await page.evaluate(() => {
      return {
        name: document.getElementById('patientName')?.value,
        id: document.getElementById('patientId')?.value,
        date: document.getElementById('collectionDate')?.value,
        provider: document.getElementById('provider')?.value,
      };
    });
    console.log('Meta Fields:', metaFields);

    const rowCountBefore = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    await page.click('#ocr-add-row-btn');
    await new Promise((r) => setTimeout(r, 300));
    const rowCountAfter = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    console.log(`Clinical rows: ${rowCountBefore} -> ${rowCountAfter}`);

    // Verify Right Panel Analysis
    const globalScore = await page.$eval('.ocr-circle-meter-text', (el) => el.innerText.trim());
    const globalLabel = await page.$eval('.ocr-global-confidence-label', (el) => el.innerText.replace(/\s+/g, ' ').trim());
    const alertTitles = await page.$$eval('.ocr-alert-card .ocr-alert-title', (titles) => titles.map((t) => t.innerText.trim()));
    console.log('Global Confidence:', globalScore, globalLabel);
    console.log('Alert Titles:', alertTitles);

    // Test Reject Modal
    await page.click('#ocr-reject-btn');
    await new Promise((r) => setTimeout(r, 400));
    const modalOpen = await page.$('.ocr-dialog-backdrop');
    console.log('Reject Modal Opened:', !!modalOpen);

    const cancelBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.ocr-dialog-card button'));
      return btns.find((b) => b.textContent && b.textContent.includes('Cancel'));
    });
    if (cancelBtn && cancelBtn.asElement()) {
      await cancelBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 400));
    }
    const modalClosed = (await page.$('.ocr-dialog-backdrop')) === null;
    console.log('Reject Modal Closed:', modalClosed);

    // Capture Exact 1280x1024 Screenshot
    const screenshotPath = path.join(ARTIFACTS_DIR, 'figma_ocr_workspace_1280x1024_corrected.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);

    results.workspace = {
      panelLayout,
      taskId,
      docTitle,
      actionButtons,
      zoomWorking: zoomBefore === '100%' && zoomAfter === '115%' && zoomReset === '100%',
      rowAdded: rowCountAfter === rowCountBefore + 1,
      modalWorking: !!modalOpen && modalClosed,
      globalScore,
      alertCount: alertTitles.length,
    };

    // ------------------------------------------------------------------------
    // TEST 2: Verify AdminEditFacility (CSS diagnostic regression check)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Verify Facility Edit Screen ---');
    await page.goto(`${BASE_URL}/admin/facilities/fac-1/edit`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.facility-edit-shell', { timeout: 10000 });
    const photoCards = await page.$$('.facility-edit-photo-card');
    console.log('Photo cards found in AdminEditFacility:', photoCards.length);
    results.editFacility = {
      rendered: true,
      photoCardsCount: photoCards.length,
    };

    results.consoleErrors = consoleErrors;
    console.log('\n--- SUMMARY ---');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await browser.close();
  }
}

verifyWorkspaceFigmaStrict();
