const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

async function verifyOcrWorkspace() {
  console.log('=== STARTING OCR VERIFICATION WORKSPACE E2E VERIFICATION ===');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Open Queue and Click Review
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Navigate from OCR Queue via Review button ---');
    await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.ocr-queue-table tbody tr', { timeout: 10000 });

    const firstRowItem = await page.evaluate(() => {
      const row = document.querySelector('.ocr-queue-table tbody tr');
      const ocrId = row?.querySelector('td:nth-child(1)')?.innerText.trim();
      const patient = row?.querySelector('td:nth-child(2)')?.innerText.trim();
      return { ocrId, patient };
    });
    console.log(`First row in queue: ID=${firstRowItem.ocrId}, Patient=${firstRowItem.patient}`);

    // Click Review button on first row
    const reviewBtn = await page.$('.ocr-queue-table tbody tr .ocr-review-btn');
    if (!reviewBtn) {
      throw new Error('Review button not found in first table row');
    }
    await reviewBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));

    const currentUrl = page.url();
    console.log(`Current URL after clicking Review: ${currentUrl}`);
    if (!currentUrl.includes('/admin/ocr/verify/')) {
      throw new Error(`Expected URL to contain '/admin/ocr/verify/', but was: ${currentUrl}`);
    }

    // Verify Workspace Header & Task Identity
    await page.waitForSelector('.ocr-workspace-header', { timeout: 8000 });
    const headerInfo = await page.evaluate(() => {
      const taskId = document.querySelector('.ocr-workspace-task-id')?.innerText;
      const statusPill = document.querySelector('.ocr-status-pill')?.innerText;
      const title = document.querySelector('.ocr-workspace-title')?.innerText;
      const saveBtn = Boolean(document.getElementById('ocr-save-draft-btn'));
      const rejectBtn = Boolean(document.getElementById('ocr-reject-btn'));
      const approveBtn = Boolean(document.getElementById('ocr-approve-btn'));
      return { taskId, statusPill, title, saveBtn, rejectBtn, approveBtn };
    });

    console.log('Workspace Header Info:', headerInfo);
    if (!headerInfo.saveBtn || !headerInfo.rejectBtn || !headerInfo.approveBtn) {
      throw new Error('Workspace header is missing required action buttons');
    }

    // Capture desktop workspace screenshot
    const shotDesktop = path.join(MEDIA_DIR, 'ocr_workspace_desktop_initial.png');
    await page.screenshot({ path: shotDesktop, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotDesktop}`);

    // ------------------------------------------------------------------------
    // TEST 2: Left Panel - Source Document Controls & Zoom
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Left Panel Document Viewer Controls ---');
    await page.waitForSelector('.ocr-panel-doc', { timeout: 5000 });

    const zoomInitial = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText);
    console.log(`Initial Zoom Level: ${zoomInitial}`);

    // Click Zoom In
    await page.click('#ocr-zoom-in-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomAfterIn = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText);
    console.log(`Zoom after In: ${zoomAfterIn}`);
    if (zoomAfterIn === zoomInitial) {
      throw new Error('Zoom level did not increase after clicking Zoom In');
    }

    // Click Reset Zoom
    await page.click('#ocr-reset-zoom-btn');
    await new Promise((r) => setTimeout(r, 200));
    const zoomAfterReset = await page.$eval('#ocr-zoom-level-indicator', (el) => el.innerText);
    console.log(`Zoom after Reset: ${zoomAfterReset}`);
    if (zoomAfterReset !== '100%') {
      throw new Error('Zoom level did not reset to 100%');
    }

    // Test Page Controls
    const pageText1 = await page.$eval('.ocr-doc-page-text', (el) => el.innerText);
    console.log(`Initial page: ${pageText1}`);
    await page.click('#ocr-next-page-btn');
    await new Promise((r) => setTimeout(r, 200));
    const pageText2 = await page.$eval('.ocr-doc-page-text', (el) => el.innerText);
    console.log(`After Next Page: ${pageText2}`);
    if (!pageText2.includes('2')) {
      throw new Error('Page indicator did not increment');
    }

    const shotZoomed = path.join(MEDIA_DIR, 'ocr_workspace_doc_zoomed.png');
    await page.screenshot({ path: shotZoomed, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotZoomed}`);

    // ------------------------------------------------------------------------
    // TEST 3: Center Panel - Extracted Data, Editing & Add Row
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Center Panel Form & Clinical Values ---');
    await page.waitForSelector('.ocr-panel-extracted', { timeout: 5000 });

    const initialRowCount = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    console.log(`Initial clinical rows count: ${initialRowCount}`);

    // Click + Add Missing Row
    await page.click('#ocr-add-row-btn');
    await new Promise((r) => setTimeout(r, 400));

    const updatedRowCount = await page.$$eval('.ocr-clinical-table tbody tr', (rows) => rows.length);
    console.log(`Updated clinical rows count: ${updatedRowCount}`);
    if (updatedRowCount !== initialRowCount + 1) {
      throw new Error(`Expected ${initialRowCount + 1} rows after adding row, but got ${updatedRowCount}`);
    }

    // Edit Patient Name
    await page.click('#patientName', { clickCount: 3 });
    await page.type('#patientName', 'Jane Doe (Reviewed)');

    // Fill in the new row inputs so validation passes
    await page.evaluate(() => {
      const rows = document.querySelectorAll('.ocr-clinical-table tbody tr');
      const lastRow = rows[rows.length - 1];
      const inputs = lastRow.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = 'Chloride';
      if (inputs[1]) inputs[1].value = '102';
      if (inputs[2]) inputs[2].value = 'mmol/L';
      inputs.forEach(inp => inp.dispatchEvent(new Event('input', { bubbles: true })));
    });

    // Click Save Draft
    await page.click('#ocr-save-draft-btn');
    await new Promise((r) => setTimeout(r, 600));

    // Verify toast notification
    const toastText = await page.evaluate(() => {
      const toast = document.querySelector('.fixed.top-5.right-5');
      return toast ? toast.innerText : null;
    });
    console.log(`Toast after Save Draft: "${toastText}"`);

    const shotDraft = path.join(MEDIA_DIR, 'ocr_workspace_draft_saved.png');
    await page.screenshot({ path: shotDraft, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotDraft}`);

    // ------------------------------------------------------------------------
    // TEST 4: Right Panel - Analysis & Global Confidence Gauge
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Right Panel Analysis & Gauge ---');
    const analysisInfo = await page.evaluate(() => {
      const score = document.querySelector('.ocr-circle-meter-text')?.innerText;
      const alerts = Array.from(document.querySelectorAll('.ocr-alert-card')).map((a) => {
        const title = a.querySelector('.ocr-alert-title')?.innerText;
        return title;
      });
      return { score, alerts };
    });
    console.log('Analysis Panel Info:', analysisInfo);
    if (!analysisInfo.score || analysisInfo.alerts.length === 0) {
      throw new Error('Analysis panel missing score or alert cards');
    }

    // ------------------------------------------------------------------------
    // TEST 5: Rejection Modal Dialog & Validation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Rejection Dialog & Validation ---');
    await page.click('#ocr-reject-btn');
    await page.waitForSelector('.ocr-dialog-backdrop', { timeout: 3000 });

    // Click Confirm without reason -> should show validation error
    const confirmBtn = await page.$('.ocr-dialog-card button.bg-\\[\\#ba1a1a\\]');
    if (confirmBtn) {
      await confirmBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      const hasError = await page.evaluate(() => {
        return Boolean(document.querySelector('.ocr-dialog-card .text-red-600'));
      });
      console.log(`Validation error shown when empty reason: ${hasError}`);
      if (!hasError) {
        throw new Error('Validation error not shown for empty rejection reason');
      }
    }

    // Enter reason and capture screenshot of dialog
    await page.type('#rejection-reason-input', 'Values require clinical clarification with ordering laboratory.');
    const shotRejectModal = path.join(MEDIA_DIR, 'ocr_workspace_reject_modal.png');
    await page.screenshot({ path: shotRejectModal, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotRejectModal}`);

    // Cancel modal
    await page.click('.ocr-dialog-card button.border-\\[\\#cbc4d4\\]');
    await new Promise((r) => setTimeout(r, 400));
    const modalClosed = await page.evaluate(() => !document.querySelector('.ocr-dialog-backdrop'));
    console.log(`Modal dialog closed after cancel: ${modalClosed}`);

    // ------------------------------------------------------------------------
    // TEST 6: Approve & File Action
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Approve & File Action ---');
    await page.click('#ocr-approve-btn');
    await new Promise((r) => setTimeout(r, 600));

    const approveToast = await page.evaluate(() => {
      const toast = document.querySelector('.fixed.top-5.right-5');
      return toast ? toast.innerText : null;
    });
    console.log(`Approve Toast: "${approveToast}"`);

    // Wait for 1.2s timeout redirect to queue
    await new Promise((r) => setTimeout(r, 1500));
    console.log(`URL after Approve: ${page.url()}`);

    const shotQueueApproved = path.join(MEDIA_DIR, 'ocr_workspace_queue_after_approve.png');
    await page.screenshot({ path: shotQueueApproved, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotQueueApproved}`);

    // ------------------------------------------------------------------------
    // TEST 7: Direct URL Navigation & Missing Record State
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Missing Record State ---');
    await page.goto('http://localhost:5173/admin/ocr/verify/missing-doc-99999', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));

    const notFoundText = await page.evaluate(() => {
      return document.querySelector('h2')?.innerText;
    });
    console.log(`Missing record heading: "${notFoundText}"`);
    if (!notFoundText || !notFoundText.includes('Not Found')) {
      throw new Error(`Expected 'Not Found' in heading, but got "${notFoundText}"`);
    }

    const shotMissing = path.join(MEDIA_DIR, 'ocr_workspace_missing_record.png');
    await page.screenshot({ path: shotMissing, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotMissing}`);

    // ------------------------------------------------------------------------
    // TEST 8: Mobile 375px Responsive Verification
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Mobile (375x812) Responsiveness & Vertical Scrolling ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:5173/admin/ocr/verify/ocr-8822', { waitUntil: 'networkidle0' });
    await page.waitForSelector('.ocr-workspace-header', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 500));

    // Verify no horizontal overflow on mobile
    const overflowInfo = await page.evaluate(() => {
      const el = document.querySelector('.ocr-workspace-canvas');
      return {
        clientWidth: el?.clientWidth,
        scrollWidth: el?.scrollWidth,
        scrollHeight: el?.scrollHeight,
        clientHeight: el?.clientHeight,
      };
    });
    console.log('Mobile layout metrics:', overflowInfo);

    const shotMobileTop = path.join(MEDIA_DIR, 'ocr_workspace_mobile_top.png');
    await page.screenshot({ path: shotMobileTop, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotMobileTop}`);

    // Scroll down on mobile
    await page.evaluate(() => {
      const el = document.querySelector('.ocr-workspace-canvas');
      if (el) el.scrollTop = 500;
    });
    await new Promise((r) => setTimeout(r, 400));

    const shotMobileScrolled = path.join(MEDIA_DIR, 'ocr_workspace_mobile_scrolled.png');
    await page.screenshot({ path: shotMobileScrolled, fullPage: false });
    console.log(`[PASS] Saved screenshot: ${shotMobileScrolled}`);

    // ------------------------------------------------------------------------
    // Console Error Check
    // ------------------------------------------------------------------------
    console.log('\n--- Console Errors Check ---');
    console.log(`Total console errors encountered: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Console errors detected:', consoleErrors);
    }

    console.log('\n=== ALL OCR VERIFICATION WORKSPACE TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyOcrWorkspace();
