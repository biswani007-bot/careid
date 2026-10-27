const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

async function runOcrVerification() {
  console.log('--- STARTING OCR QUEUE VERIFICATION ---');

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

  console.log('\n1. Navigating to http://localhost:5173/admin/ocr/queue ...');
  await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ocr-queue-table tbody tr', { timeout: 10000 });

  // TEST 1: Page 1 Record Count
  const page1RowDetails = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
    return rows.map((r, i) => {
      const ocrId = r.querySelector('td:nth-child(1)')?.innerText.trim();
      const patient = r.querySelector('td:nth-child(2)')?.innerText.trim();
      const docType = r.querySelector('td:nth-child(3)')?.innerText.trim();
      return { index: i, ocrId, patient, docType };
    });
  });

  console.log(`Page 1 row count: ${page1RowDetails.length}`);
  console.log('Page 1 IDs:', page1RowDetails.map(r => r.ocrId).join(', '));
  if (page1RowDetails.length !== 10) {
    throw new Error(`Expected exactly 10 rows on Page 1, but found ${page1RowDetails.length}`);
  }

  // Capture Page 1 top
  const p1TopPath = path.join(MEDIA_DIR, 'ocr_queue_page1_top.png');
  await page.screenshot({ path: p1TopPath });
  console.log(`Saved screenshot: ${p1TopPath}`);

  // TEST 2: Scrolling and Pagination Footer Accessibility
  console.log('\n2. Testing scrolling to reveal remaining rows and pagination footer...');
  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-queue-canvas');
    if (canvas) {
      canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
    }
  });
  await new Promise(r => setTimeout(r, 400));

  const scrollInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-queue-canvas');
    const footer = document.querySelector('.ocr-pagination-footer');
    const prevBtn = footer?.querySelector('button[aria-label="Previous page"]');
    const nextBtn = footer?.querySelector('button[aria-label="Next page"]');
    const rect = footer?.getBoundingClientRect();

    const isFooterVisible = rect && rect.top >= 0 && rect.bottom <= window.innerHeight;

    return {
      canvasScrollTop: canvas ? canvas.scrollTop : 0,
      canvasScrollHeight: canvas ? canvas.scrollHeight : 0,
      canvasClientHeight: canvas ? canvas.clientHeight : 0,
      footerText: footer?.innerText.replace(/\s+/g, ' ').trim(),
      isFooterVisible,
      prevDisabled: prevBtn?.disabled,
      nextDisabled: nextBtn?.disabled,
    };
  });

  console.log('Scroll Info:', JSON.stringify(scrollInfo, null, 2));
  if (!scrollInfo.isFooterVisible && scrollInfo.canvasScrollTop === 0) {
    throw new Error('Canvas failed to scroll down to footer');
  }
  if (!scrollInfo.prevDisabled) {
    throw new Error('Expected Previous button to be disabled on Page 1');
  }
  if (scrollInfo.nextDisabled) {
    throw new Error('Expected Next button to be enabled on Page 1');
  }

  // Capture Page 1 scrolled with footer visible
  const p1ScrolledPath = path.join(MEDIA_DIR, 'ocr_queue_page1_scrolled.png');
  await page.screenshot({ path: p1ScrolledPath });
  console.log(`Saved screenshot: ${p1ScrolledPath}`);

  // TEST 3: Next Page (Page 2) Navigation
  console.log('\n3. Clicking Next to navigate to Page 2...');
  await page.click('.ocr-pagination-footer button[aria-label="Next page"]');
  await new Promise(r => setTimeout(r, 600));

  const page2RowDetails = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
    const footer = document.querySelector('.ocr-pagination-footer');
    const prevBtn = footer?.querySelector('button[aria-label="Previous page"]');
    const nextBtn = footer?.querySelector('button[aria-label="Next page"]');
    return {
      rows: rows.map((r, i) => {
        const ocrId = r.querySelector('td:nth-child(1)')?.innerText.trim();
        const patient = r.querySelector('td:nth-child(2)')?.innerText.trim();
        return { index: i, ocrId, patient };
      }),
      footerText: footer?.innerText.replace(/\s+/g, ' ').trim(),
      prevDisabled: prevBtn?.disabled,
      nextDisabled: nextBtn?.disabled,
    };
  });

  console.log(`Page 2 row count: ${page2RowDetails.rows.length}`);
  console.log('Page 2 IDs:', page2RowDetails.rows.map(r => r.ocrId).join(', '));
  console.log('Page 2 Footer:', page2RowDetails.footerText);

  // Check no duplicates between Page 1 and Page 2
  const p1Ids = new Set(page1RowDetails.map(r => r.ocrId));
  const duplicates = page2RowDetails.rows.filter(r => p1Ids.has(r.ocrId));
  if (duplicates.length > 0) {
    throw new Error(`Found duplicates on Page 2: ${JSON.stringify(duplicates)}`);
  }
  if (!page2RowDetails.nextDisabled) {
    throw new Error('Expected Next button to be disabled on the last page (Page 2)');
  }
  if (page2RowDetails.prevDisabled) {
    throw new Error('Expected Previous button to be enabled on Page 2');
  }

  const p2Path = path.join(MEDIA_DIR, 'ocr_queue_page2.png');
  await page.screenshot({ path: p2Path });
  console.log(`Saved screenshot: ${p2Path}`);

  // TEST 4: Previous Page Navigation
  console.log('\n4. Clicking Previous to return to Page 1...');
  await page.click('.ocr-pagination-footer button[aria-label="Previous page"]');
  await new Promise(r => setTimeout(r, 600));

  const returnedP1Count = await page.evaluate(() => {
    return document.querySelectorAll('.ocr-queue-table tbody tr').length;
  });
  console.log(`Returned to Page 1. Row count: ${returnedP1Count}`);
  if (returnedP1Count !== 10) {
    throw new Error(`Expected 10 rows on returning to Page 1, got ${returnedP1Count}`);
  }

  // TEST 5: Search Filter Resets Pagination
  console.log('\n5. Testing search query and pagination reset...');
  // Go to page 2 first
  await page.click('.ocr-pagination-footer button[aria-label="Next page"]');
  await new Promise(r => setTimeout(r, 400));

  // Type in search box
  await page.type('.careid-header-search-input', 'Sarah');
  await new Promise(r => setTimeout(r, 500));

  const searchResults = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
    const footer = document.querySelector('.ocr-pagination-footer');
    return {
      rowCount: rows.length,
      firstOcrId: rows[0]?.querySelector('td:nth-child(1)')?.innerText.trim(),
      footerText: footer?.innerText.replace(/\s+/g, ' ').trim(),
    };
  });
  console.log('Search "Sarah" results:', searchResults);
  if (searchResults.rowCount !== 1 || !searchResults.firstOcrId.includes('8821')) {
    throw new Error(`Unexpected search result: ${JSON.stringify(searchResults)}`);
  }

  // Clear search
  await page.focus('.careid-header-search-input');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 600));

  // TEST 6: Status and Category Filters
  console.log('\n6. Testing status and category filters...');
  // Click "Pending"
  await page.click('.ocr-filter-btn:nth-child(2)'); // Pending
  await new Promise(r => setTimeout(r, 400));
  const pendingCount = await page.evaluate(() => document.querySelectorAll('.ocr-queue-table tbody tr').length);
  console.log(`Pending filter count: ${pendingCount}`);

  // Click "All Status"
  await page.click('.ocr-filter-btn:nth-child(1)'); // All Status
  await new Promise(r => setTimeout(r, 400));
  const resetCount = await page.evaluate(() => document.querySelectorAll('.ocr-queue-table tbody tr').length);
  console.log(`All Status filter count: ${resetCount}`);
  if (resetCount !== 10) {
    throw new Error(`Expected 10 rows after resetting filter, got ${resetCount}`);
  }

  // TEST 7: Mobile Viewport (375x667)
  console.log('\n7. Testing mobile responsiveness (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 500));

  const mobileInfo = await page.evaluate(() => {
    const body = document.body;
    const tableWrapper = document.querySelector('.ocr-table-wrapper');
    const table = document.querySelector('.ocr-queue-table');
    return {
      bodyScrollWidth: body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasPageOverflow: body.scrollWidth > window.innerWidth,
      tableWrapperScrollWidth: tableWrapper?.scrollWidth,
      tableScrollWidth: table?.scrollWidth,
    };
  });
  console.log('Mobile Viewport Info:', mobileInfo);
  if (mobileInfo.hasPageOverflow) {
    throw new Error(`Mobile viewport has whole-page horizontal overflow: scrollWidth=${mobileInfo.bodyScrollWidth} > innerWidth=${mobileInfo.windowInnerWidth}`);
  }

  const mobilePath = path.join(MEDIA_DIR, 'ocr_queue_mobile_375px.png');
  await page.screenshot({ path: mobilePath });
  console.log(`Saved screenshot: ${mobilePath}`);

  // Check console errors
  console.log('\n8. Checking browser console errors...');
  console.log(`Total console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Console errors logged:', consoleErrors);
    throw new Error(`Found ${consoleErrors.length} browser console errors`);
  }

  console.log('\n--- ALL OCR QUEUE TESTS PASSED SUCCESSFULLY! ---');
  await browser.close();
}

runOcrVerification().catch((err) => {
  console.error('OCR Verification Failed:', err);
  process.exit(1);
});
