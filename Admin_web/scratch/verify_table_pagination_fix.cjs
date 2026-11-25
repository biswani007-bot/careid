const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { name: 'all_records', url: 'http://localhost:5173/admin/records', expectedTotal: 75 },
    { name: 'medical_records', url: 'http://localhost:5173/admin/records/medical', expectedTotal: 25 },
    { name: 'dental_records', url: 'http://localhost:5173/admin/records/dental', expectedTotal: 25 },
    { name: 'vision_records', url: 'http://localhost:5173/admin/records/vision', expectedTotal: 25 },
  ];

  const results = [];

  for (const route of routes) {
    console.log(`\n========================================`);
    console.log(`Testing Route: ${route.url}`);
    await page.goto(route.url, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // 1. Verify Page 1 Rows and Patient Names
    const page1Data = await page.evaluate(() => {
      // Find rows in tbody
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const rowInfo = rows.map((r) => {
        const text = r.innerText;
        // Find patient name cell
        const pCell = r.querySelector('.col-patient, .col-cat-patient');
        const pName = pCell ? (pCell.querySelector('.patient-name-label, .patient-name-text')?.innerText || pCell.innerText) : '';
        const idCell = r.querySelector('.col-patient-id, .col-cat-patient-id');
        const pId = idCell ? idCell.innerText : '';
        const recTitle = r.querySelector('.col-record-name, .col-cat-record')?.innerText || '';
        return { pName: pName.trim(), pId: pId.trim(), recTitle: recTitle.trim() };
      });

      // Find summary text
      const summaryElem = document.querySelector('.records-pagination-bar span, .category-pagination-bar .pagination-info-text');
      const summaryText = summaryElem ? summaryElem.innerText : '';

      // Check Previous button disabled state
      const prevBtn = document.querySelector('.pagination-btn[aria-label="Previous page"], .pagination-page-btn[aria-label="Previous page"]');
      const prevDisabled = prevBtn ? prevBtn.disabled : false;

      return { rowCount: rows.length, rowInfo, summaryText, prevDisabled };
    });

    console.log(`[${route.name}] Page 1 Row Count: ${page1Data.rowCount} (Expected: 10)`);
    console.log(`[${route.name}] Summary: "${page1Data.summaryText}"`);
    console.log(`[${route.name}] Previous Button Disabled on Page 1: ${page1Data.prevDisabled}`);

    // Check patient names are valid and non-empty
    let invalidNamesCount = 0;
    page1Data.rowInfo.forEach((item, idx) => {
      if (!item.pName || item.pName === 'undefined' || item.pName === 'null') {
        console.error(`  ROW ${idx + 1} INVALID PATIENT NAME: "${item.pName}"`);
        invalidNamesCount++;
      }
    });

    console.log(`[${route.name}] Page 1 First 3 Patients:`, page1Data.rowInfo.slice(0, 3).map(p => `${p.pName} (${p.pId})`));

    // Capture Page 1 screenshot
    const shotPage1 = path.join(outDir, `${route.name}_page1.png`);
    await page.screenshot({ path: shotPage1 });
    console.log(`Saved screenshot: ${shotPage1}`);

    // 2. Click Page 2 and Verify Next 10 Records
    console.log(`Clicking Page 2...`);
    const clickedPage2 = await page.evaluate(() => {
      const btn = document.querySelector(
        '.records-pagination-bar .pagination-btn[aria-label="Page 2"], .category-pagination-bar .pagination-page-btn[aria-label="Page 2"]'
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (!clickedPage2) {
      console.error(`[${route.name}] Could not find Page 2 button!`);
    }

    await new Promise((r) => setTimeout(r, 800));

    const page2Data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const rowInfo = rows.map((r) => {
        const pCell = r.querySelector('.col-patient, .col-cat-patient');
        const pName = pCell ? (pCell.querySelector('.patient-name-label, .patient-name-text')?.innerText || pCell.innerText) : '';
        const idCell = r.querySelector('.col-patient-id, .col-cat-patient-id');
        const pId = idCell ? idCell.innerText : '';
        const recTitle = r.querySelector('.col-record-name, .col-cat-record')?.innerText || '';
        return { pName: pName.trim(), pId: pId.trim(), recTitle: recTitle.trim() };
      });

      const summaryElem = document.querySelector('.records-pagination-bar span, .category-pagination-bar .pagination-info-text');
      const summaryText = summaryElem ? summaryElem.innerText : '';

      const prevBtn = document.querySelector('.pagination-btn[aria-label="Previous page"], .pagination-page-btn[aria-label="Previous page"]');
      const prevDisabled = prevBtn ? prevBtn.disabled : false;

      return { rowCount: rows.length, rowInfo, summaryText, prevDisabled };
    });

    console.log(`[${route.name}] Page 2 Row Count: ${page2Data.rowCount} (Expected: 10)`);
    console.log(`[${route.name}] Page 2 Summary: "${page2Data.summaryText}"`);
    console.log(`[${route.name}] Previous Button Disabled on Page 2: ${page2Data.prevDisabled}`);

    // Verify distinct from page 1
    const p1Titles = new Set(page1Data.rowInfo.map((r) => r.recTitle));
    let duplicates = 0;
    page2Data.rowInfo.forEach((r) => {
      if (p1Titles.has(r.recTitle)) duplicates++;
    });

    console.log(`[${route.name}] Duplicates between Page 1 and Page 2: ${duplicates} (Expected: 0)`);
    console.log(`[${route.name}] Page 2 First 3 Patients:`, page2Data.rowInfo.slice(0, 3).map(p => `${p.pName} (${p.pId})`));

    // Capture Page 2 screenshot
    const shotPage2 = path.join(outDir, `${route.name}_page2.png`);
    await page.screenshot({ path: shotPage2 });
    console.log(`Saved screenshot: ${shotPage2}`);

    // 3. Test Filter Reset to Page 1
    console.log(`Testing search filter reset to page 1...`);
    const searchSelector = route.name === 'all_records' ? '.filter-search-input' : '.category-search-input';
    await page.type(searchSelector, 'Metabolic');
    await new Promise((r) => setTimeout(r, 600));

    const resetPage = await page.evaluate(() => {
      const activeBtn = document.querySelector(
        '.records-pagination-bar .pagination-btn.active, .category-pagination-bar .pagination-page-btn.active'
      );
      return activeBtn ? activeBtn.innerText.trim() : null;
    });

    console.log(`[${route.name}] Active page after typing in search: ${resetPage} (Expected: 1)`);

    results.push({
      route: route.name,
      page1Count: page1Data.rowCount,
      page2Count: page2Data.rowCount,
      invalidNamesCount,
      duplicates,
      filterResetPassed: resetPage === '1',
    });
  }

  // 4. Test Mobile/Narrow Viewport Responsiveness
  console.log('\nTesting responsive width (768px)...');
  await page.setViewport({ width: 768, height: 900 });
  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  const scrollCheck = await page.evaluate(() => {
    const scrollContainer = document.querySelector('.records-table-scroll');
    const table = document.querySelector('.records-table');
    return {
      hasScroll: scrollContainer ? scrollContainer.scrollWidth > scrollContainer.clientWidth : false,
      bodyOverflow: document.body.scrollWidth > window.innerWidth,
    };
  });

  console.log(`Narrow width (768px): Table scrollable inside container = ${scrollCheck.hasScroll}, Body horizontal overflow = ${scrollCheck.bodyOverflow}`);
  const shotMobile = path.join(outDir, 'all_records_narrow.png');
  await page.screenshot({ path: shotMobile });
  console.log(`Saved narrow screenshot: ${shotMobile}`);

  await browser.close();

  console.log('\n========================================');
  console.log('SUMMARY RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('========================================');
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
