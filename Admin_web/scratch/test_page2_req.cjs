const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
  page.on('request', r => {
    if (r.url().includes('/api/v1/referrals') && r.method() === 'GET') {
      console.log('REQ GET:', r.url());
    }
  });
  page.on('response', async r => {
    if (r.url().includes('/api/v1/referrals') && r.request().method() === 'GET') {
      const data = await r.json().catch(() => null);
      console.log('RESP GET:', r.url(), 'items:', data?.data?.map(d => d.referralNumber)?.slice(0, 2));
    }
  });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.querySelector('.referral-pagination-text')?.textContent.includes('of 32'));

  console.log('--- Clicking Next to page 2 ---');
  await page.click('.referral-page-btn[aria-label="Next Page"]');
  await new Promise(r => setTimeout(r, 4000));

  const items = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));
  console.log('Current items in DOM after 4s:', items.slice(0, 3));

  await browser.close();
})();

