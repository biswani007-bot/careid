const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ocr-queue-table tbody tr');

  console.log('Initial footer:');
  console.log(await page.evaluate(() => document.querySelector('.ocr-pagination-footer')?.innerText.replace(/\s+/g, ' ')));

  console.log('Clicking Next via evaluate...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Next page"]');
    console.log('Button found:', !!btn, 'disabled:', btn?.disabled);
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 600));

  console.log('After Next click:');
  console.log(await page.evaluate(() => document.querySelector('.ocr-pagination-footer')?.innerText.replace(/\s+/g, ' ')));
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.ocr-queue-table tbody tr td:first-child')).map(e => e.innerText));
  console.log('Rows count:', rows.length, 'IDs:', rows);

  await browser.close();
})();
