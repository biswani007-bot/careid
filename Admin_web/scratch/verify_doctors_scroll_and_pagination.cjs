const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

async function main() {
  console.log('--- STARTING DOCTOR DIRECTORY VALIDATION ---');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.token;

  // Initialize auth
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'usr_superadmin',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator',
      email: 'superadmin@careid.test'
    }));
  }, token);

  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await page.waitForFunction(
    () => document.querySelectorAll('.doctors-table tbody tr').length > 0 && !document.querySelector('.doctors-skeleton-row'),
    { timeout: 10000 }
  );
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n[TEST 1] Page 1 - Initial 10 Rows & Layout Check');
  const test1 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    const prevBtn = document.querySelector('.doctors-page-btn[aria-label="Previous Page"]');
    const nextBtn = document.querySelector('.doctors-page-btn[aria-label="Next Page"]');
    const tableCard = document.querySelector('.doctors-table-card');
    const tableWrapper = document.querySelector('.doctors-table-wrapper');

    return {
      rowCount: rows.length,
      paginationText,
      prevDisabled: prevBtn?.disabled,
      nextDisabled: nextBtn?.disabled,
      tableCardHeight: tableCard?.clientHeight,
      tableWrapperScrollHeight: tableWrapper?.scrollHeight,
      tableWrapperClientHeight: tableWrapper?.clientHeight,
      hasWrapperVerticalScroll: (tableWrapper?.scrollHeight || 0) > (tableWrapper?.clientHeight || 0),
    };
  });
  console.log('Test 1 Data:', test1);
  if (test1.rowCount !== 10) throw new Error(`Expected 10 rows on Page 1, got ${test1.rowCount}`);
  if (test1.paginationText !== 'Showing 1 to 10 of 12 doctors') throw new Error(`Unexpected pagination text: ${test1.paginationText}`);
  if (!test1.prevDisabled) throw new Error('Previous button should be disabled on Page 1');
  if (test1.nextDisabled) throw new Error('Next button should be enabled on Page 1');
  if (test1.hasWrapperVerticalScroll) throw new Error('Inner table wrapper should NOT have vertical scrollbar');

  // Screenshot Page 1 top
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doc_page1_top.png') });

  // Scroll down canvas to show rows 6-10 and pagination
  console.log('\n[TEST 2] Scrolling Canvas to bottom');
  await page.evaluate(() => {
    const canvas = document.querySelector('.doctors-main-canvas');
    if (canvas) canvas.scrollTop = canvas.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 500));

  const scrolledView = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const pagination = document.querySelector('.doctors-pagination');
    const pagRect = pagination?.getBoundingClientRect();
    const row10Rect = rows[9]?.getBoundingClientRect();
    return {
      row10Visible: row10Rect && row10Rect.top >= 0 && row10Rect.bottom <= window.innerHeight,
      paginationVisible: pagRect && pagRect.top >= 0 && pagRect.bottom <= window.innerHeight,
      row10Name: rows[9]?.querySelector('.doctors-doctor-name')?.textContent?.trim(),
    };
  });
  console.log('Scrolled View Check:', scrolledView);
  if (!scrolledView.paginationVisible) throw new Error('Pagination footer must be fully visible when scrolled down');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doc_page1_scrolled.png') });

  // Test Row 10 Kebab menu popover
  console.log('\n[TEST 3] Row 10 Kebab Menu Popover');
  const kebabTest = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const row10 = rows[9];
    const kebabBtn = row10?.querySelector('.doctors-action-btn');
    if (kebabBtn) kebabBtn.click();
    return !!kebabBtn;
  });
  await new Promise(r => setTimeout(r, 300));
  const kebabMenuInfo = await page.evaluate(() => {
    const menu = document.querySelector('.doctors-row-menu');
    if (!menu) return null;
    const rect = menu.getBoundingClientRect();
    const hasPopoverUp = menu.classList.contains('popover-up');
    return {
      hasPopoverUp,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      fullyInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
    };
  });
  console.log('Kebab Menu Info on Row 10:', kebabMenuInfo);
  if (!kebabMenuInfo?.hasPopoverUp) throw new Error('Row 10 kebab menu should have popover-up class to prevent clipping');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doc_row10_menu.png') });

  // Close kebab menu
  await page.evaluate(() => {
    document.body.click();
  });

  // Test Page 2 Navigation
  console.log('\n[TEST 4] Page 2 Navigation via Next Button');
  await page.evaluate(() => {
    const nextBtn = document.querySelector('.doctors-page-btn[aria-label="Next Page"]');
    if (nextBtn) nextBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const test4 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const names = rows.map(r => r.querySelector('.doctors-doctor-name')?.textContent?.trim());
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    const prevBtn = document.querySelector('.doctors-page-btn[aria-label="Previous Page"]');
    const nextBtn = document.querySelector('.doctors-page-btn[aria-label="Next Page"]');

    return {
      rowCount: rows.length,
      names,
      paginationText,
      prevDisabled: prevBtn?.disabled,
      nextDisabled: nextBtn?.disabled,
    };
  });
  console.log('Test 4 Data (Page 2):', test4);
  if (test4.rowCount !== 2) throw new Error(`Expected 2 rows on Page 2, got ${test4.rowCount}`);
  if (test4.paginationText !== 'Showing 11 to 12 of 12 doctors') throw new Error(`Unexpected Page 2 text: ${test4.paginationText}`);
  if (test4.prevDisabled) throw new Error('Previous button should be enabled on Page 2');
  if (!test4.nextDisabled) throw new Error('Next button should be disabled on Page 2');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doc_page2.png') });

  // Test Page 1 Navigation via Previous Button
  console.log('\n[TEST 5] Previous Page Navigation');
  await page.evaluate(() => {
    const prevBtn = document.querySelector('.doctors-page-btn[aria-label="Previous Page"]');
    if (prevBtn) prevBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const test5 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    return { rowCount: rows.length, paginationText };
  });
  console.log('Test 5 Data (Back to Page 1):', test5);
  if (test5.rowCount !== 10) throw new Error('Failed to return to 10 rows on Page 1');

  // Test Filters resetting to Page 1
  console.log('\n[TEST 6] Filter Reset to Page 1');
  // First go to Page 2
  await page.evaluate(() => {
    const btn2 = Array.from(document.querySelectorAll('.doctors-page-btn')).find(b => b.textContent?.trim() === '2');
    if (btn2) btn2.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Change status tab to 'Suspended'
  await page.evaluate(() => {
    const suspendedPill = Array.from(document.querySelectorAll('.doctors-pill')).find(p => p.textContent?.trim() === 'Suspended');
    if (suspendedPill) suspendedPill.click();
  });
  await page.waitForFunction(() => !document.querySelector('.doctors-skeleton-row'), { timeout: 8000 });
  await new Promise(r => setTimeout(r, 400));

  const test6Status = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    const activePage = document.querySelector('.doctors-page-btn.active')?.textContent?.trim();
    return { rowCount: rows.length, paginationText, activePage };
  });
  console.log('Test 6 (Status Filter Reset):', test6Status);
  if (test6Status.activePage !== '1') throw new Error('Status filter did not reset to Page 1');
  if (test6Status.rowCount !== 2) throw new Error(`Unexpected rowCount for Suspended doctors: ${test6Status.rowCount}`);
  if (test6Status.paginationText !== 'Showing 1 to 2 of 2 doctors') throw new Error(`Unexpected text for Suspended doctors: ${test6Status.paginationText}`);

  // Reset status to 'All'
  await page.evaluate(() => {
    const allPill = Array.from(document.querySelectorAll('.doctors-pill')).find(p => p.textContent?.trim() === 'All');
    if (allPill) allPill.click();
  });
  await page.waitForFunction(() => !document.querySelector('.doctors-skeleton-row'), { timeout: 8000 });
  await new Promise(r => setTimeout(r, 400));

  // Test Search Filter resetting to Page 1
  // First go to Page 2
  await page.evaluate(() => {
    const btn2 = Array.from(document.querySelectorAll('.doctors-page-btn')).find(b => b.textContent?.trim() === '2');
    if (btn2) btn2.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Type in search input
  await page.type('.patients-header-search-input', 'Julian');
  await page.waitForFunction(() => !document.querySelector('.doctors-skeleton-row'), { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const test6Search = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    const activePage = document.querySelector('.doctors-page-btn.active')?.textContent?.trim();
    const name = rows[0]?.querySelector('.doctors-doctor-name')?.textContent?.trim();
    return { rowCount: rows.length, paginationText, activePage, name };
  });
  console.log('Test 6 (Search Filter Reset):', test6Search);
  if (test6Search.activePage !== '1') throw new Error('Search filter did not reset to Page 1');
  if (test6Search.rowCount !== 1 || !test6Search.name?.includes('Julian')) throw new Error('Search filter failed');

  // Clear search input using native value setter for React
  await page.evaluate(() => {
    const input = document.querySelector('.patients-header-search-input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForFunction(() => !document.querySelector('.doctors-skeleton-row'), { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));

  const finalCheck = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    return { rowCount: rows.length, paginationText };
  });
  console.log('Final Reset Check:', finalCheck);
  if (finalCheck.rowCount !== 10) throw new Error('Did not restore 10 rows on clearing search');

  console.log('\nALL 6 VALIDATION TESTS PASSED PERFECTLY!');
  await browser.close();
}

main().catch(err => {
  console.error('\nVALIDATION ERROR:', err);
  process.exit(1);
});
