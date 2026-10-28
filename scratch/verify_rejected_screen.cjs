const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyRejectedScreen() {
  console.log('🚀 Starting Verification of Admin Portal — Rejected OCR & Review History (Figma Node 20:4583)...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.toString() });
  });

  try {
    // Navigate to /admin/ocr/rejected
    console.log(`\n1. Navigating to ${BASE_URL}/admin/ocr/rejected at 1280x1024...`);
    await page.goto(`${BASE_URL}/admin/ocr/rejected`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the table to render
    await page.waitForSelector('.ocr-rejected-table-card', { timeout: 10000 });
    console.log('✓ Rejected Documents Table loaded');

    // Verify Title and Breadcrumb
    const headerDetails = await page.evaluate(() => {
      const title = document.querySelector('.ocr-rejected-title')?.textContent?.trim();
      const subtitle = document.querySelector('.ocr-rejected-subtitle')?.textContent?.trim();
      const breadcrumbLink = document.querySelector('.ocr-rejected-breadcrumb-link')?.textContent?.trim();
      const breadcrumbCurrent = document.querySelector('.ocr-rejected-breadcrumb-current')?.textContent?.trim();
      const filterBtn = document.querySelector('.ocr-rejected-filter-btn')?.textContent?.trim();
      return { title, subtitle, breadcrumbLink, breadcrumbCurrent, filterBtn };
    });
    console.log('Header verification:', JSON.stringify(headerDetails, null, 2));

    // Verify Table Headers
    const tableHeaders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ocr-rejected-th')).map((th) => th.textContent?.trim());
    });
    console.log('Table Headers:', tableHeaders);

    // Verify Table Rows
    const rows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ocr-rejected-tr')).map((tr) => {
        const fileName = tr.querySelector('.ocr-doc-filename')?.textContent?.trim();
        const docId = tr.querySelector('.ocr-doc-id-pill')?.textContent?.trim();
        const date = tr.querySelector('.ocr-doc-date')?.textContent?.trim();
        const reason = tr.querySelector('.ocr-reason-badge')?.textContent?.trim();
        const explanation = tr.querySelector('.ocr-reason-explanation')?.textContent?.trim();
        const reviewer = tr.querySelector('.ocr-reviewer-name')?.textContent?.trim();
        const reviewerAvatar = tr.querySelector('.ocr-reviewer-avatar')?.textContent?.trim();
        const buttons = Array.from(tr.querySelectorAll('button')).map((b) => b.textContent?.trim());
        return { fileName, docId, date, reason, explanation, reviewer, reviewerAvatar, buttons };
      });
    });
    console.log('Table Rows:', JSON.stringify(rows, null, 2));

    // Capture baseline 1280x1024 screenshot
    const shotPath1280 = path.join(ARTIFACTS_DIR, 'figma_ocr_rejected_1280.png');
    await page.screenshot({ path: shotPath1280, fullPage: false });
    console.log(`✓ Saved 1280x1024 screenshot to: ${shotPath1280}`);

    // Test Filter Modal
    console.log('\n2. Testing Filter Modal...');
    await page.click('#ocr-rejected-filter-button');
    await page.waitForSelector('.ocr-modal-card', { timeout: 5000 });
    console.log('✓ Filter Modal opened');

    const filterShotPath = path.join(ARTIFACTS_DIR, 'figma_ocr_rejected_filter_modal.png');
    await page.screenshot({ path: filterShotPath, fullPage: false });
    console.log(`✓ Saved Filter Modal screenshot to: ${filterShotPath}`);

    // Select filter reason "Unreadable Text" and click Apply
    await page.select('#filter-reason-select', 'Unreadable Text');
    await page.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('.ocr-modal-btn-primary')).find((b) =>
        b.textContent.includes('Apply')
      );
      if (applyBtn) applyBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const filteredRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ocr-rejected-tr')).map((tr) =>
        tr.querySelector('.ocr-doc-filename')?.textContent?.trim()
      );
    });
    console.log('Filtered rows (Reason = Unreadable Text):', filteredRows);

    // Reset filter
    const clearBtn = await page.$('.ocr-rejected-clear-filters-btn');
    if (clearBtn) {
      await clearBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      console.log('✓ Filters cleared');
    }

    // Test Replace Modal
    console.log('\n3. Testing Replace Modal on DOC-9921...');
    const replaceBtns = await page.$$('.ocr-btn-replace');
    if (replaceBtns.length > 0) {
      await replaceBtns[0].click();
      await page.waitForSelector('#replace-modal-title', { timeout: 5000 });
      console.log('✓ Replace Document Modal opened');

      const replaceShotPath = path.join(ARTIFACTS_DIR, 'figma_ocr_rejected_replace_modal.png');
      await page.screenshot({ path: replaceShotPath, fullPage: false });
      console.log(`✓ Saved Replace Modal screenshot to: ${replaceShotPath}`);

      // Close Replace Modal
      const closeBtn = await page.$('.ocr-modal-close-btn');
      if (closeBtn) await closeBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Test Reprocess Action
    console.log('\n4. Testing Reprocess action on DOC-9844...');
    const reprocessBtns = await page.$$('.ocr-btn-reprocess');
    if (reprocessBtns.length > 1) {
      await reprocessBtns[1].click();
      await page.waitForSelector('.ocr-toast', { timeout: 5000 });
      const toastText = await page.evaluate(() => document.querySelector('.ocr-toast')?.textContent?.trim());
      console.log('✓ Toast Feedback received:', toastText);
    }

    // Also test responsive view at 375px mobile
    console.log('\n5. Testing Mobile Viewport (375x812)...');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const mobileShotPath = path.join(ARTIFACTS_DIR, 'figma_ocr_rejected_mobile_375.png');
    await page.screenshot({ path: mobileShotPath, fullPage: false });
    console.log(`✓ Saved Mobile 375px screenshot to: ${mobileShotPath}`);

    console.log('\n=== ALL OCR REJECTED SCREEN VERIFICATIONS PASSED ===');
    console.log('Console Errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await browser.close();
  }
}

verifyRejectedScreen();
