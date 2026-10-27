const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runComprehensiveVerification() {
  console.log('Starting comprehensive verification of CareID Admin Web Health Records...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push({ url: page.url(), text });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  const testReport = {
    scrolling: [],
    pagination: [],
    pageSizeChanges: [],
    detailsAndAudit: [],
    mobile: [],
    regression: [],
  };

  const routes = [
    { url: '/admin/records', name: 'All Records', prefix: 'all' },
    { url: '/admin/records/medical', name: 'Medical Records', prefix: 'medical' },
    { url: '/admin/records/dental', name: 'Dental Records', prefix: 'dental' },
    { url: '/admin/records/vision', name: 'Vision Records', prefix: 'vision' },
  ];

  try {
    // =========================================================================
    // SECTION 1: VERIFY SCROLLING & 10 ROWS PER PAGE ACROSS ALL 4 ROUTES
    // =========================================================================
    console.log('\n--- SECTION 1: VERIFY SCROLLING & 10 ROWS ON ALL 4 ROUTES ---');
    for (const r of routes) {
      console.log(`Checking route: ${r.name} (${r.url})...`);
      await page.goto(`${BASE_URL}${r.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await sleep(600);

      const routeMetrics = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        const pagination = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        const table = document.querySelector('table');
        const tableScroll = document.querySelector('.records-table-scroll, .category-table-scroll');
        const tableCard = document.querySelector('.records-table-card, .category-table-card');

        return {
          rowCount: rows.length,
          paginationVisible: !!pagination && pagination.offsetHeight > 0,
          paginationText: pagination ? pagination.innerText.replace(/\s+/g, ' ').trim() : '',
          tableMounted: !!table,
          tableScrollHasOverflowX: tableScroll ? tableScroll.scrollWidth > tableScroll.clientWidth : false,
          tableCardHeight: tableCard ? tableCard.offsetHeight : 0,
        };
      });

      console.log(`  -> Row count: ${routeMetrics.rowCount}`);
      console.log(`  -> Pagination visible: ${routeMetrics.paginationVisible} ("${routeMetrics.paginationText}")`);
      console.log(`  -> Table card height: ${routeMetrics.tableCardHeight}px`);

      testReport.scrolling.push({
        route: r.url,
        rowsDisplayed: routeMetrics.rowCount,
        passedRows: routeMetrics.rowCount === 10,
        paginationVisible: routeMetrics.paginationVisible,
        paginationText: routeMetrics.paginationText,
      });

      // Save screenshot
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `comprehensive_${r.prefix}_p1.png`) });
    }

    // =========================================================================
    // SECTION 2: VERIFY PAGINATION MECHANICS (PAGE 1 vs PAGE 2, PREV/NEXT, FILTERS)
    // =========================================================================
    console.log('\n--- SECTION 2: VERIFY PAGINATION MECHANICS (ALL 4 ROUTES) ---');
    for (const r of routes) {
      console.log(`\nTesting pagination on ${r.name}...`);
      await page.goto(`${BASE_URL}${r.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await sleep(500);

      // 1. Get Page 1 records identifiers
      const p1Records = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        return rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim());
      });

      // 2. Click Page 2 button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.records-pagination-bar button, .category-pagination-bar button'));
        const btn2 = buttons.find((b) => b.innerText.trim() === '2');
        if (btn2) btn2.click();
      });
      await sleep(600);

      // 3. Get Page 2 records identifiers
      const p2Records = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        return rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim());
      });

      // Check for zero duplicates
      const intersection = p1Records.filter((rec) => p2Records.includes(rec));
      const hasDuplicates = intersection.length > 0;

      console.log(`  -> Page 1 rows: ${p1Records.length}, Page 2 rows: ${p2Records.length}`);
      console.log(`  -> Duplicate rows between P1 & P2: ${intersection.length}`);

      // 4. Test Prev button
      const clickedPrev = await page.evaluate(() => {
        const prevBtn = document.querySelector('button[aria-label="Previous page"]');
        if (prevBtn && !prevBtn.disabled) {
          prevBtn.click();
          return true;
        }
        return false;
      });
      await sleep(500);

      const backOnP1 = await page.evaluate(() => {
        const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        if (!pag) return false;
        const text = pag.innerText.replace(/\s+/g, ' ');
        return text.includes('1–10') || text.includes('1-10');
      });
      console.log(`  -> Prev button clicked: ${clickedPrev}, Navigated back to Page 1: ${backOnP1}`);

      // 5. Test Next button
      const clickedNext = await page.evaluate(() => {
        const nextBtn = document.querySelector('button[aria-label="Next page"], .records-pagination-bar button:has(svg.lucide-chevron-right)');
        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return true;
        }
        return false;
      });
      await sleep(500);

      const onP2Again = await page.evaluate(() => {
        const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        if (!pag) return false;
        const text = pag.innerText.replace(/\s+/g, ' ');
        return text.includes('11–20') || text.includes('11-20');
      });
      console.log(`  -> Next button clicked: ${clickedNext}, Re-navigated to Page 2: ${onP2Again}`);

      // 6. Test Search resets pagination to Page 1
      const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="record"]');
      if (searchInput) {
        // While still on Page 2, type search
        await searchInput.type('Sarah');
        await sleep(500);

        const onP1AfterSearch = await page.evaluate(() => {
          const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
          if (!pag) return false;
          const text = pag.innerText.replace(/\s+/g, ' ');
          return text.includes('1–') || text.includes('1-');
        });
        console.log(`  -> Search query typed, pagination reset to Page 1: ${onP1AfterSearch}`);

        // 7. Test Empty Search State
        await page.evaluate((el) => {
          el.value = 'NONEXISTENT_QUERY_XYZ_123';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, searchInput);
        await sleep(500);

        const emptyStateShown = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          return (
            bodyText.includes('no health records found') ||
            bodyText.includes('no records match') ||
            bodyText.includes('clear all filters')
          );
        });
        console.log(`  -> Nonexistent search displays intentional empty state: ${emptyStateShown}`);

        // 8. Test Reset Filters button
        const resetClicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const resetBtn = btns.find((b) =>
            b.innerText.toLowerCase().includes('reset') ||
            b.innerText.toLowerCase().includes('clear all filters')
          );
          if (resetBtn) {
            resetBtn.click();
            return true;
          }
          return false;
        });
        await sleep(500);

        const restoredAfterReset = await page.evaluate(() => {
          const rows = document.querySelectorAll('tbody tr');
          const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
          const pagText = pag ? pag.innerText.replace(/\s+/g, ' ') : '';
          return rows.length === 10 && (pagText.includes('1–10') || pagText.includes('1-10'));
        });
        console.log(`  -> Reset filters restored Page 1 with 10 rows: ${restoredAfterReset}`);
      }

      // 9. Test Page Size Dropdown update (change 10 to 25)
      const pageSizeUpdated = await page.evaluate(() => {
        const select = document.querySelector('select[aria-label="Rows per page"], #page-size-select');
        if (select) {
          select.value = '25';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      });
      await sleep(600);

      const rowsAfterPageSize = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
      console.log(`  -> Page size changed to 25, visible rows: ${rowsAfterPageSize}`);

      // Restore to 10
      await page.evaluate(() => {
        const select = document.querySelector('select[aria-label="Rows per page"], #page-size-select');
        if (select) {
          select.value = '10';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await sleep(500);

      testReport.pagination.push({
        route: r.url,
        p1Count: p1Records.length,
        p2Count: p2Records.length,
        noDuplicates: !hasDuplicates,
        prevNavSuccess: backOnP1,
        nextNavSuccess: onP2Again,
      });

      testReport.pageSizeChanges.push({
        route: r.url,
        pageSizeChangedTo25: rowsAfterPageSize > 10,
        rowsDisplayed: rowsAfterPageSize,
      });
    }

    // =========================================================================
    // SECTION 3: VERIFY COMPLETE RECORD DETAILS & AUDIT TRAIL ACROSS MODALITIES
    // =========================================================================
    console.log('\n--- SECTION 3: COMPLETE RECORD DETAILS & AUDIT TRAIL ---');

    const recordsToTest = [
      { id: 'rec-10491', origin: '/admin/records/dental', expectedCategory: 'Dental' },
      { id: 'rec-10492', origin: '/admin/records/medical', expectedCategory: 'Medical' },
      { id: 'rec-10490', origin: '/admin/records/vision', expectedCategory: 'Vision' },
      { id: 'rec-10488', origin: '/admin/records', expectedCategory: 'Medical' },
    ];

    for (const item of recordsToTest) {
      console.log(`\nTesting Record Details navigation from ${item.origin} for ${item.id}...`);
      await page.goto(`${BASE_URL}${item.origin}`, { waitUntil: 'networkidle0', timeout: 15000 });
      await sleep(600);

      // Open quick modal
      const openModalSuccess = await page.evaluate((recId) => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        for (const row of rows) {
          if (row.innerText.includes(recId.toUpperCase()) || row.innerText.includes(recId)) {
            const btn = row.querySelector('button.btn-category-row-view, button.record-title-link, button[aria-label*="View"], td.col-record-name');
            if (btn) {
              btn.click();
              return true;
            }
            row.click();
            return true;
          }
        }
        // Fallback: click first row's view action
        const firstBtn = document.querySelector('tbody tr button.btn-category-row-view, tbody tr button.record-title-link, tbody tr');
        if (firstBtn) {
          firstBtn.click();
          return true;
        }
        return false;
      }, item.id);

      await sleep(500);

      // In modal, click "View Full Details & Audit Trail"
      const clickedFullDetails = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const auditBtn = btns.find((b) =>
          b.innerText.includes('Full Details') ||
          b.innerText.includes('Audit Trail')
        );
        if (auditBtn) {
          auditBtn.click();
          return true;
        }
        return false;
      });

      console.log(`  -> Clicked 'View Full Details & Audit Trail': ${clickedFullDetails}`);
      await sleep(800);

      const currentUrl = page.url();
      console.log(`  -> Current URL: ${currentUrl}`);

      // Verify Record Details Content
      const detailsContent = await page.evaluate(() => {
        const title = document.querySelector('h1, h2')?.innerText || '';
        const bodyText = document.body.innerText;
        const auditNodes = document.querySelectorAll('.audit-timeline-node, .audit-trail-item');
        const hasAuditSection =
          bodyText.includes('Audit Timeline') ||
          bodyText.includes('Audit') ||
          bodyText.includes('Append-Only Ledger') ||
          !!document.getElementById('audit-timeline-section');
        const hasAdaptiveCanvas =
          bodyText.includes('Panoramic Radiograph') ||
          bodyText.includes('Metabolic Panel') ||
          bodyText.includes('Optical Coherence Tomography') ||
          bodyText.includes('Clinical Diagnostic') ||
          bodyText.includes('DICOM');

        return {
          title,
          hasAuditSection,
          auditNodeCount: auditNodes.length,
          hasAdaptiveCanvas,
        };
      });

      console.log(`  -> Record title / header: "${detailsContent.title}"`);
      console.log(`  -> Adaptive clinical canvas present: ${detailsContent.hasAdaptiveCanvas}`);
      console.log(`  -> Audit section found: ${detailsContent.hasAuditSection} (${detailsContent.auditNodeCount} audit nodes)`);

      // Screenshot Record Details
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, `comprehensive_details_${item.id}.png`) });

      // Click "Back to Records"
      const backClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const back = btns.find((b) => b.innerText.includes('Back to') || b.querySelector('svg.lucide-arrow-left'));
        if (back) {
          back.click();
          return true;
        }
        return false;
      });
      await sleep(600);

      const returnedUrl = page.url();
      console.log(`  -> Clicked back, returned to: ${returnedUrl}`);
      const returnedToOrigin = returnedUrl.includes(item.origin);
      console.log(`  -> Accurately returned to origin (${item.origin}): ${returnedToOrigin}`);

      testReport.detailsAndAudit.push({
        recordId: item.id,
        openedFrom: item.origin,
        detailsUrl: currentUrl,
        returnedToOrigin,
        auditSectionFound: detailsContent.hasAuditSection,
        adaptiveCanvasFound: detailsContent.hasAdaptiveCanvas,
      });
    }

    // =========================================================================
    // SECTION 4: MOBILE RESPONSIVENESS & VIEWPORT-LEVEL OVERFLOW CHECK
    // =========================================================================
    console.log('\n--- SECTION 4: MOBILE RESPONSIVENESS (375x667) ---');
    await page.setViewport({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(600);

    const mobileMetrics = await page.evaluate(() => {
      const docWidth = document.documentElement.offsetWidth;
      const windowWidth = window.innerWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const htmlScrollWidth = document.documentElement.scrollWidth;

      const tableScroll = document.querySelector('.records-table-scroll');
      const tableScrollWidth = tableScroll ? tableScroll.scrollWidth : 0;
      const tableClientWidth = tableScroll ? tableScroll.clientWidth : 0;

      return {
        windowWidth,
        bodyScrollWidth,
        htmlScrollWidth,
        hasPageLevelOverflow: htmlScrollWidth > windowWidth + 1 || bodyScrollWidth > windowWidth + 1,
        tableHasInternalScroll: tableScrollWidth > tableClientWidth,
      };
    });

    console.log(`  -> Window width: ${mobileMetrics.windowWidth}px`);
    console.log(`  -> HTML scrollWidth: ${mobileMetrics.htmlScrollWidth}px`);
    console.log(`  -> Body scrollWidth: ${mobileMetrics.bodyScrollWidth}px`);
    console.log(`  -> Has page-level horizontal overflow: ${mobileMetrics.hasPageLevelOverflow}`);
    console.log(`  -> Table wrapper has internal scroll: ${mobileMetrics.tableHasInternalScroll}`);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'comprehensive_mobile_375px.png') });

    testReport.mobile.push({
      viewport: '375x667',
      noPageOverflow: !mobileMetrics.hasPageLevelOverflow,
      tableInternalScroll: mobileMetrics.tableHasInternalScroll,
    });

    // =========================================================================
    // SECTION 5: REGRESSION PROTECTION (OCR QUEUE, OCR ANALYTICS)
    // =========================================================================
    console.log('\n--- SECTION 5: REGRESSION PROTECTION (OCR MODULES) ---');
    await page.setViewport({ width: 1440, height: 900 });

    // Test OCR Queue
    await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(500);
    const ocrQueueMounted = await page.evaluate(() => {
      return !!document.querySelector('table') || document.body.innerText.includes('OCR');
    });
    console.log(`  -> OCR Queue accessible & mounted: ${ocrQueueMounted}`);

    // Test OCR Analytics Dashboard
    await page.goto(`${BASE_URL}/admin/ocr/analytics`, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(500);
    const ocrDashMounted = await page.evaluate(() => {
      return document.body.innerText.includes('OCR') || document.body.innerText.includes('Analytics');
    });
    console.log(`  -> OCR Analytics Dashboard accessible & mounted: ${ocrDashMounted}`);

    testReport.regression.push({
      ocrQueue: ocrQueueMounted,
      ocrAnalytics: ocrDashMounted,
    });

  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log('FINAL TEST EXECUTION SUMMARY:');
  console.log('======================================================================');
  console.log(JSON.stringify(testReport, null, 2));
  console.log(`\nBrowser console errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors);
  }
}

runComprehensiveVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
