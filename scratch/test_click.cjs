const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testClick() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.records-pagination-bar .pagination-btn'));
    return btns.map((b) => ({ text: b.innerText, ariaLabel: b.getAttribute('aria-label'), class: b.className }));
  });

  console.log('Pagination buttons found:', buttons);

  // Click button with aria-label="Page 2"
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('.records-pagination-bar .pagination-btn[aria-label="Page 2"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked page 2:', clicked);

  await new Promise((r) => setTimeout(r, 1000));

  const pageAfter = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.records-table tbody tr'));
    const titles = rows.map((r) => r.querySelector('.col-record-name')?.innerText?.split('\n')[0]);
    const summary = document.querySelector('.records-pagination-bar span')?.innerText;
    const activeBtn = document.querySelector('.records-pagination-bar .pagination-btn.active')?.innerText;
    return { summary, activeBtn, titles };
  });

  console.log('After clicking page 2:', pageAfter);

  await browser.close();
}

testClick().catch(console.error);
