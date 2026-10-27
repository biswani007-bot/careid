const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runUiVerification() {
  console.log('--- REPRODUCING AND VERIFYING ACTUAL UI BEHAVIOR ---');

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

  const routesToTest = [
    { url: '/admin/records', name: 'All Records', clickSelector: 'tbody tr:first-child' },
    { url: '/admin/records/medical', name: 'Medical Records', clickSelector: 'tbody tr:first-child .btn-category-row-view' },
    { url: '/admin/records/dental', name: 'Dental Records', clickSelector: 'tbody tr:first-child .btn-category-row-view' },
    { url: '/admin/records/vision', name: 'Vision Records', clickSelector: 'tbody tr:first-child .btn-category-row-view' },
  ];

  for (const r of routesToTest) {
    console.log(`\n======================================================`);
    console.log(`TESTING FLOW: ${r.name} (${r.url})`);
    console.log(`======================================================`);

    await page.goto(`${BASE_URL}${r.url}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('tbody tr', { timeout: 10000 });
    await sleep(400);

    // 1. Open modal
    console.log(`1. Opening record modal via ${r.clickSelector}...`);
    await page.waitForSelector(r.clickSelector, { timeout: 5000 });
    await page.click(r.clickSelector);
    await sleep(600);

    // Inspect modal button colors
    const modalBtnColors = await page.evaluate(() => {
      const detailsBtn = document.querySelector('.btn-modal-details, .btn-category-modal-details');
      if (!detailsBtn) return null;
      const s = window.getComputedStyle(detailsBtn);
      return {
        text: detailsBtn.innerText.trim(),
        color: s.color,
        backgroundColor: s.backgroundColor,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
      };
    });
    console.log('Modal details button styles:', modalBtnColors);

    // Capture screenshot of open modal
    const modalShot = `fresh_modal_${r.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, modalShot) });
    console.log(`Saved screenshot: ${modalShot}`);

    // 2. Click "View Full Details & Audit Trail"
    console.log('2. Clicking "View Full Details & Audit Trail"...');
    await page.evaluate(() => {
      const btn = document.querySelector('.btn-modal-details, .btn-category-modal-details');
      if (btn) btn.click();
    });
    await sleep(800);

    const destUrl = page.url();
    console.log(`Destination URL: ${destUrl}`);
    const navigatedToDetails = destUrl.includes('/admin/records/rec-');
    console.log(`Navigated to dedicated details page: ${navigatedToDetails}`);

    // Inspect action buttons on details page
    const detailsActions = await page.evaluate(() => {
      const downloadBtn = document.querySelector('.btn-details-download');
      const backBtn = document.querySelector('.btn-details-back');
      const auditBtn = document.querySelector('.btn-details-audit');
      const flagBtn = document.querySelector('.btn-details-flag');

      const getStyle = (el) => {
        if (!el) return null;
        const s = window.getComputedStyle(el);
        return { text: el.innerText.trim(), color: s.color, bg: s.backgroundColor };
      };

      return {
        download: getStyle(downloadBtn),
        back: getStyle(backBtn),
        audit: getStyle(auditBtn),
        flag: getStyle(flagBtn),
      };
    });
    console.log('Details page button styles:', detailsActions);

    // Capture screenshot of details page
    const detailsShot = `fresh_details_${r.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, detailsShot) });
    console.log(`Saved screenshot: ${detailsShot}`);

    // 3. Click "Back to Records"
    console.log('3. Clicking "Back to Records"...');
    await page.evaluate(() => {
      const backBtn = document.querySelector('.btn-details-back');
      if (backBtn) backBtn.click();
    });
    await sleep(600);

    const backUrl = page.url();
    console.log(`URL after Back button: ${backUrl}`);
    const returnedProperly = backUrl.endsWith(r.url) || backUrl.includes(r.url);
    console.log(`Returned to originating route: ${returnedProperly}`);

    // Check that modal is NOT open
    const modalStillOpen = await page.evaluate(() => {
      return !!document.querySelector('.records-modal-card, .category-modal-card, .btn-modal-details, .btn-category-modal-details');
    });
    console.log(`Modal is completely dismissed (not open): ${!modalStillOpen}`);

    // Capture screenshot after returning
    const returnedShot = `fresh_returned_${r.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, returnedShot) });
    console.log(`Saved screenshot: ${returnedShot}`);
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`ALL TEST RUN FINISHED. Console errors count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
}

runUiVerification().catch((e) => console.error(e));
