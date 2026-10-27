const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

const ROUTES_TO_TEST = [
  { path: '/admin/records', name: 'All Health Records', expectedTotal: 75, expectedCategoryCount: 75 },
  { path: '/admin/records/medical', name: 'Medical Records', expectedTotal: 25, expectedCategoryCount: 25 },
  { path: '/admin/records/dental', name: 'Dental Records', expectedTotal: 25, expectedCategoryCount: 25 },
  { path: '/admin/records/vision', name: 'Vision Records', expectedTotal: 25, expectedCategoryCount: 25 },
];

async function runVerification() {
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

  const results = [];

  for (const route of ROUTES_TO_TEST) {
    console.log(`\n==================================================`);
    console.log(`TESTING ROUTE: ${route.path} (${route.name})`);
    console.log(`==================================================`);

    await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 600));

    // 1. Initial State & DOM inspection
    const p1 = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return null;
      const rect = table.getBoundingClientRect();
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const rowTexts = rows.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
      const pagEl = document.querySelector('.records-pagination-bar, .category-pagination-bar');
      const pagText = pagEl ? pagEl.innerText.replace(/\s+/g, ' ').trim() : '';

      const prevBtn = pagEl ? pagEl.querySelector('button[aria-label="Previous page"]') : null;
      const nextBtn = pagEl ? pagEl.querySelector('button[aria-label="Next page"]') : null;

      // Extract cells from first row for detailed inspection
      const firstRowCells = rows[0]
        ? Array.from(rows[0].querySelectorAll('td')).map((td) => td.innerText.replace(/\s+/g, ' ').trim())
        : [];

      return {
        tableVisible: rect.width > 0 && rect.height > 0,
        rowCount: rows.length,
        paginationText: pagText,
        prevDisabled: prevBtn ? prevBtn.hasAttribute('disabled') : false,
        nextDisabled: nextBtn ? nextBtn.hasAttribute('disabled') : false,
        firstRowCells,
        firstRowText: rowTexts[0] || '',
        allRows: rowTexts,
      };
    });

    if (!p1) {
      console.error(`❌ NO TABLE FOUND on ${route.path}!`);
      results.push({ route: route.path, success: false, reason: 'No <table> in DOM' });
      continue;
    }

    console.log(`Page 1: Table Visible = ${p1.tableVisible}, Row Count = ${p1.rowCount}`);
    console.log(`Pagination: "${p1.paginationText}"`);
    console.log(`Previous Button Disabled on Page 1: ${p1.prevDisabled}`);
    console.log(`First Row Details:`, p1.firstRowCells);

    // Check for patient name validity
    const hasUndefinedName = p1.allRows.some(
      (r) => r.includes('undefined') || r.includes('null') || r.includes('Unknown Patient')
    );
    console.log(`Has undefined/null/unknown patient names: ${hasUndefinedName}`);

    // Screenshot Page 1
    const screenshotP1 = `${route.path.replace(/\//g, '_').slice(1)}_page1.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, screenshotP1) });

    // 2. Page 2 Navigation
    let p2 = null;
    const page2Btn = await page.evaluateHandle(() => {
      const pagEl = document.querySelector('.records-pagination-bar, .category-pagination-bar');
      if (!pagEl) return null;
      const btns = Array.from(pagEl.querySelectorAll('button'));
      return btns.find((b) => b.innerText.trim() === '2') || null;
    });

    if (page2Btn && (await page2Btn.asElement())) {
      await page2Btn.asElement().click();
      await new Promise((r) => setTimeout(r, 600));

      p2 = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const rowTexts = rows.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
        const pagEl = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        const pagText = pagEl ? pagEl.innerText.replace(/\s+/g, ' ').trim() : '';
        const prevBtn = pagEl ? pagEl.querySelector('button[aria-label="Previous page"]') : null;

        return {
          rowCount: rows.length,
          paginationText: pagText,
          prevDisabled: prevBtn ? prevBtn.hasAttribute('disabled') : false,
          firstRowText: rowTexts[0] || '',
          allRows: rowTexts,
        };
      });

      console.log(`Page 2: Row Count = ${p2.rowCount}`);
      console.log(`Page 2 Pagination: "${p2.paginationText}"`);
      console.log(`Previous Button Disabled on Page 2: ${p2.prevDisabled}`);

      // Screenshot Page 2
      const screenshotP2 = `${route.path.replace(/\//g, '_').slice(1)}_page2.png`;
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, screenshotP2) });

      // Compare P1 and P2
      const overlap = p2.allRows.filter((r) => p1.allRows.includes(r));
      console.log(`Overlap between Page 1 and Page 2: ${overlap.length} (Expected: 0)`);
    }

    // 3. Search and Reset Filter Verification
    console.log(`Testing Search & Filter Reset...`);
    const searchInput = await page.$('.filter-search-input, .category-search-input');
    if (searchInput) {
      await searchInput.click({ clickCount: 3 });
      await searchInput.type('Vance');
      await new Promise((r) => setTimeout(r, 600));

      const searchState = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const rowTexts = rows.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
        const pagEl = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        return {
          count: rows.length,
          pagText: pagEl ? pagEl.innerText.replace(/\s+/g, ' ').trim() : '',
          allContainVance: rowTexts.every((r) => r.toLowerCase().includes('vance')),
        };
      });

      console.log(`Search 'Vance' count: ${searchState.count}, all rows contain 'Vance': ${searchState.allContainVance}`);
      console.log(`Search Pagination: "${searchState.pagText}"`);

      // Click Reset Filters
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const resetBtn = btns.find((b) => b.innerText.toLowerCase().includes('reset'));
        if (resetBtn) resetBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      const afterResetCount = await page.evaluate(() => document.querySelectorAll('tbody tr').length);
      console.log(`After Reset Filters, row count: ${afterResetCount} (Expected: 10)`);
    }

    results.push({
      route: route.path,
      name: route.name,
      page1Rows: p1.rowCount,
      page1Pagination: p1.paginationText,
      page1PrevDisabled: p1.prevDisabled,
      page2Rows: p2 ? p2.rowCount : null,
      page2Pagination: p2 ? p2.paginationText : null,
      page2PrevDisabled: p2 ? p2.prevDisabled : null,
      noUndefinedNames: !hasUndefinedName,
      distinctPages: p2 ? p1.firstRowText !== p2.firstRowText : true,
    });
  }

  // 4. Test Mobile / Tablet Responsiveness
  console.log(`\n==================================================`);
  console.log(`TESTING MOBILE VIEWPORT (375px width)`);
  console.log(`==================================================`);
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));

  const mobileCheck = await page.evaluate(() => {
    const table = document.querySelector('table');
    const scroll = document.querySelector('.records-table-scroll');
    const hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
    return {
      tablePresent: !!table,
      tableScrollPresent: !!scroll,
      scrollHasOverflow: scroll ? scroll.scrollWidth > scroll.clientWidth : false,
      bodyHasNoHorizontalOverflow: !hasHorizontalOverflow,
    };
  });
  console.log(`Mobile table present: ${mobileCheck.tablePresent}`);
  console.log(`Internal table scroll active: ${mobileCheck.scrollHasOverflow}`);
  console.log(`Page body does not overflow horizontally: ${mobileCheck.bodyHasNoHorizontalOverflow}`);

  // Screenshot Mobile
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_records_mobile_375px.png') });

  await browser.close();

  console.log(`\n==================================================`);
  console.log(`COMPLETE VERIFICATION SUMMARY:`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nBrowser Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error(consoleErrors);
  }
}

runVerification().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
