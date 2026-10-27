const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function inspectOcrQueue() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173/admin/ocr/queue ...');
  await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle0' });

  await page.waitForSelector('.ocr-queue-table tbody tr', { timeout: 10000 });

  const info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.ocr-queue-table tbody tr'));
    const paginationFooter = document.querySelector('.ocr-table-card > div:last-child');
    const tableCard = document.querySelector('.ocr-table-card');
    const canvas = document.querySelector('.ocr-queue-canvas');
    const mainWrapper = document.querySelector('.careid-main-wrapper');
    const body = document.body;

    const rowDetails = rows.map((r, i) => {
      const idEl = r.querySelector('td:first-child');
      const text = idEl ? idEl.innerText.trim() : '';
      const rect = r.getBoundingClientRect();
      return { index: i, text, top: rect.top, bottom: rect.bottom, height: rect.height };
    });

    const footerRect = paginationFooter ? paginationFooter.getBoundingClientRect() : null;
    const footerText = paginationFooter ? paginationFooter.innerText.replace(/\s+/g, ' ').trim() : null;

    return {
      rowCount: rows.length,
      rowDetails,
      footerText,
      footerVisible: footerRect ? (footerRect.top < window.innerHeight && footerRect.bottom > 0) : false,
      footerRect,
      windowHeight: window.innerHeight,
      canvasScrollHeight: canvas ? canvas.scrollHeight : null,
      canvasClientHeight: canvas ? canvas.clientHeight : null,
      bodyScrollHeight: body.scrollHeight,
      bodyClientHeight: body.clientHeight,
    };
  });

  console.log('Inspection result:', JSON.stringify(info, null, 2));

  const screenshotPath = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage\\inspect_ocr_queue_init.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

inspectOcrQueue().catch(err => {
  console.error('Error during inspectOcrQueue:', err);
  process.exit(1);
});
