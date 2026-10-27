const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

const ROUTES = [
  { path: '/admin/records', name: 'All Records', prefix: 'all_records' },
  { path: '/admin/records/medical', name: 'Medical Records', prefix: 'medical_records' },
  { path: '/admin/records/dental', name: 'Dental Records', prefix: 'dental_records' },
  { path: '/admin/records/vision', name: 'Vision Records', prefix: 'vision_records' },
];

async function verifyAll() {
  console.log('Launching Chrome from:', CHROME_PATH);
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
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ url: page.url(), text: err.toString() });
  });

  const summary = [];

  for (const route of ROUTES) {
    console.log(`\n======================================================================`);
    console.log(`VERIFYING: ${route.name} (${route.path})`);
    console.log(`======================================================================`);

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 600));

    // 1. Initial Desktop (1440x900) Unscrolled state
    const unscrolledData = await page.evaluate(() => {
      const table = document.querySelector('table');
      const tableCard = document.querySelector('.records-table-card, .category-table-card');
      const tableScroll = document.querySelector('.records-table-scroll, .category-table-scroll');
      const canvas = document.querySelector('.health-records-canvas, .category-records-canvas');
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const pagination = document.querySelector('.records-pagination-bar, .category-pagination-bar');

      const rowTexts = rows.map((r) => r.innerText.replace(/\s+/g, ' ').trim());
      const rowHeights = rows.map((r) => r.offsetHeight);

      return {
        tableMounted: !!table,
        tableCardHeight: tableCard ? tableCard.offsetHeight : 0,
        tableScrollHeight: tableScroll ? tableScroll.offsetHeight : 0,
        canvasScrollHeight: canvas ? canvas.scrollHeight : 0,
        canvasClientHeight: canvas ? canvas.clientHeight : 0,
        canScrollVertically: canvas ? canvas.scrollHeight > canvas.clientHeight : false,
        rowCount: rows.length,
        rowHeights,
        rowTexts,
        paginationText: pagination ? pagination.innerText.replace(/\s+/g, ' ').trim() : '',
      };
    });

    console.log(`Table mounted: ${unscrolledData.tableMounted}`);
    console.log(`Row count on Page 1: ${unscrolledData.rowCount}`);
    console.log(`Table card height: ${unscrolledData.tableCardHeight}px (should be >= 800px)`);
    console.log(`Canvas scrollHeight: ${unscrolledData.canvasScrollHeight}px, clientHeight: ${unscrolledData.canvasClientHeight}px`);
    console.log(`Can scroll vertically: ${unscrolledData.canScrollVertically}`);
    console.log(`Pagination text: "${unscrolledData.paginationText}"`);
    console.log(`First row: "${unscrolledData.rowTexts[0] || 'N/A'}"`);

    // Screenshot 1: Desktop Initial View (Unscrolled)
    const ssUnscrolled = `${route.prefix}_desktop_top.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, ssUnscrolled) });

    // 2. Scroll canvas down to view table & pagination cleanly
    await page.evaluate(() => {
      const canvas = document.querySelector('.health-records-canvas, .category-records-canvas');
      if (canvas) canvas.scrollTop = 500;
    });
    await new Promise((r) => setTimeout(r, 400));

    // Screenshot 2: Desktop Scrolled to Table
    const ssScrolled = `${route.prefix}_desktop_table_scrolled.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, ssScrolled) });

    // 3. Test Pagination: Navigate to Page 2
    let page2Data = null;
    const page2Btn = await page.evaluateHandle(() => {
      const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
      if (!pag) return null;
      const btns = Array.from(pag.querySelectorAll('button'));
      return btns.find((b) => b.innerText.trim() === '2') || null;
    });

    if (page2Btn && (await page2Btn.asElement())) {
      await page2Btn.asElement().click();
      await new Promise((r) => setTimeout(r, 600));

      page2Data = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const rowTexts = rows.map((r) => r.innerText.replace(/\s+/g, ' ').trim());
        const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        return {
          rowCount: rows.length,
          paginationText: pag ? pag.innerText.replace(/\s+/g, ' ').trim() : '',
          firstRow: rowTexts[0] || '',
          allRows: rowTexts,
        };
      });

      console.log(`Page 2 Row count: ${page2Data.rowCount}`);
      console.log(`Page 2 Pagination text: "${page2Data.paginationText}"`);
      console.log(`Page 2 First row: "${page2Data.firstRow}"`);

      const overlap = page2Data.allRows.filter((r) => unscrolledData.rowTexts.includes(r));
      console.log(`Overlap between Page 1 and Page 2: ${overlap.length} (Expected: 0)`);

      // Screenshot 3: Page 2
      const ssPage2 = `${route.prefix}_desktop_page2.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, ssPage2) });
    }

    // 4. Test Search and Filter Reset
    const searchInput = await page.$('.filter-search-input, .category-search-input');
    if (searchInput) {
      await searchInput.click({ clickCount: 3 });
      await searchInput.type('Vance');
      await new Promise((r) => setTimeout(r, 600));

      const searchCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
      console.log(`Search 'Vance' row count: ${searchCount}`);

      // Click Reset Filters
      const resetBtn = await page.$('.btn-category-reset, .records-filter-panel button:last-child');
      if (resetBtn) {
        await resetBtn.click();
        await new Promise((r) => setTimeout(r, 600));
        const afterResetCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
        console.log(`After Reset Filters row count: ${afterResetCount} (Expected: 10)`);
      }
    }

    summary.push({
      route: route.path,
      name: route.name,
      page1Rows: unscrolledData.rowCount,
      tableCardHeight: unscrolledData.tableCardHeight,
      canScrollVertically: unscrolledData.canScrollVertically,
      page2Rows: page2Data ? page2Data.rowCount : null,
      page2Distinct: page2Data ? unscrolledData.rowTexts[0] !== page2Data.firstRow : true,
      paginationP1: unscrolledData.paginationText,
      paginationP2: page2Data ? page2Data.paginationText : null,
    });
  }

  // 5. Test Mobile Viewport (375 × 667) for All Records & Category Records
  console.log(`\n======================================================================`);
  console.log(`TESTING MOBILE VIEWPORT (375 × 667)`);
  console.log(`======================================================================`);
  await page.setViewport({ width: 375, height: 667 });

  for (const route of [ROUTES[0], ROUTES[1]]) {
    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));

    const mobileInfo = await page.evaluate(() => {
      const table = document.querySelector('table');
      const tableScroll = document.querySelector('.records-table-scroll, .category-table-scroll');
      const bodyOverflows = document.documentElement.scrollWidth > window.innerWidth;
      return {
        tableMounted: !!table,
        rows: document.querySelectorAll('tbody tr').length,
        hasTableScroll: tableScroll ? tableScroll.scrollWidth > tableScroll.clientWidth : false,
        noBodyOverflow: !bodyOverflows,
      };
    });

    console.log(`[Mobile 375px] ${route.name}:`);
    console.log(`  Table mounted: ${mobileInfo.tableMounted}`);
    console.log(`  Rows: ${mobileInfo.rows}`);
    console.log(`  Table internal horizontal scroll active: ${mobileInfo.hasTableScroll}`);
    console.log(`  No horizontal body overflow: ${mobileInfo.noBodyOverflow}`);

    // Screenshot Mobile View
    const ssMobile = `${route.prefix}_mobile_375px.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, ssMobile) });
  }

  await browser.close();

  console.log(`\n======================================================================`);
  console.log(`FINAL REPORT DATA:`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Console Errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error(consoleErrors);
  }
}

verifyAll().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
