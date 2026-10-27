const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function verifyPaginationAndMobile() {
  console.log('--- VERIFYING PAGINATION, SCROLLING, AND MOBILE VIEWPORTS ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    { url: '/admin/records', name: 'All Records', prefix: 'all' },
    { url: '/admin/records/medical', name: 'Medical Records', prefix: 'medical' },
    { url: '/admin/records/dental', name: 'Dental Records', prefix: 'dental' },
    { url: '/admin/records/vision', name: 'Vision Records', prefix: 'vision' },
  ];

  for (const r of routes) {
    console.log(`\n======================================================`);
    console.log(`TESTING: ${r.name} (${r.url})`);
    console.log(`======================================================`);

    await page.goto(`${BASE_URL}${r.url}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await sleep(400);

    // 1. Get Page 1 rows count and text
    const p1Rows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log(`Page 1 row count: ${p1Rows.length}`);

    // Capture screenshot Page 1
    const p1Shot = `verified_${r.prefix}_page1.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, p1Shot) });
    console.log(`Saved screenshot: ${p1Shot}`);

    // 2. Click Next Page
    console.log('Clicking Next Page button...');
    const nextSuccess = await page.evaluate(() => {
      const nextBtn = document.querySelector('button[aria-label="Next page"], .records-pagination-bar button:has(svg.lucide-chevron-right)');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        return true;
      }
      return false;
    });
    console.log(`Next button clicked: ${nextSuccess}`);
    await sleep(600);

    // 3. Get Page 2 rows count and text
    const p2Rows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim());
    });
    console.log(`Page 2 row count: ${p2Rows.length}`);

    // Check duplicates
    const intersection = p1Rows.filter((row) => p2Rows.includes(row));
    console.log(`Duplicates between Page 1 and Page 2: ${intersection.length}`);

    // Capture screenshot Page 2
    const p2Shot = `verified_${r.prefix}_page2.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, p2Shot) });
    console.log(`Saved screenshot: ${p2Shot}`);

    // 4. Click Previous Page
    console.log('Clicking Previous Page button...');
    const prevSuccess = await page.evaluate(() => {
      const prevBtn = document.querySelector('button[aria-label="Previous page"], .records-pagination-bar button:has(svg.lucide-chevron-left)');
      if (prevBtn && !prevBtn.disabled) {
        prevBtn.click();
        return true;
      }
      return false;
    });
    console.log(`Previous button clicked: ${prevSuccess}`);
    await sleep(600);

    const backToP1 = await page.evaluate(() => {
      const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
      const text = pag ? pag.innerText.replace(/\s+/g, ' ') : '';
      return text.includes('1–10') || text.includes('1-10');
    });
    console.log(`Successfully returned to Page 1 via Previous button: ${backToP1}`);

    // 5. Test Search resets pagination to Page 1
    // Go to page 2 first
    await page.evaluate(() => {
      const nextBtn = document.querySelector('button[aria-label="Next page"], .records-pagination-bar button:has(svg.lucide-chevron-right)');
      if (nextBtn && !nextBtn.disabled) nextBtn.click();
    });
    await sleep(500);

    const searchInput = await page.$('input[placeholder*="Search"], input[placeholder*="record"]');
    if (searchInput) {
      await searchInput.type('Sarah');
      await sleep(500);
      const onP1AfterSearch = await page.evaluate(() => {
        const pag = document.querySelector('.records-pagination-bar, .category-pagination-bar');
        const text = pag ? pag.innerText.replace(/\s+/g, ' ') : '';
        return text.includes('1–') || text.includes('1-');
      });
      console.log(`Search query reset pagination to Page 1: ${onP1AfterSearch}`);

      // Clear search
      await page.evaluate((el) => {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, searchInput);
      await sleep(500);
    }
  }

  // =========================================================================
  // MOBILE VIEWPORT VERIFICATION (375x667)
  // =========================================================================
  console.log(`\n======================================================`);
  console.log(`TESTING MOBILE VIEWPORT (375x667)`);
  console.log(`======================================================`);

  await page.setViewport({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await sleep(500);

  const mobileCheck = await page.evaluate(() => {
    const htmlScroll = document.documentElement.scrollWidth;
    const bodyScroll = document.body.scrollWidth;
    const windowW = window.innerWidth;

    const tableScroll = document.querySelector('.records-table-scroll');
    const tableScrollW = tableScroll ? tableScroll.scrollWidth : 0;
    const tableClientW = tableScroll ? tableScroll.clientWidth : 0;

    return {
      windowW,
      htmlScroll,
      bodyScroll,
      hasPageOverflow: htmlScroll > windowW + 1 || bodyScroll > windowW + 1,
      tableScrollsInternally: tableScrollW > tableClientW,
    };
  });

  console.log('Mobile viewport checks:', mobileCheck);
  const mobileShot = 'verified_mobile_375px.png';
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, mobileShot) });
  console.log(`Saved screenshot: ${mobileShot}`);

  await browser.close();
}

verifyPaginationAndMobile().catch((e) => console.error(e));
