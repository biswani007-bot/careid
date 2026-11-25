const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
  page.on('response', async r => {
    if (r.url().includes('/api/v1/referrals') && r.request().method() === 'GET') {
      console.log('GET RESP:', r.status(), r.url());
    }
  });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !document.querySelector('.referral-loading-state'));

  console.log('--- Page 1 Loaded ---');
  let text = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  let ind = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  let count = await page.$$eval('tbody tr', rows => rows.length);
  console.log(`P1: text="${text}", ind="${ind}", rows=${count}`);

  console.log('Clicking Next to page 2...');
  const [resp2] = await Promise.all([
    page.waitForResponse(r => r.url().includes('page=2') && r.status() === 200),
    page.click('.referral-page-btn[aria-label="Next Page"]'),
  ]);
  await new Promise(r => setTimeout(r, 500));
  text = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  ind = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  count = await page.$$eval('tbody tr', rows => rows.length);
  console.log(`P2: text="${text}", ind="${ind}", rows=${count}`);

  console.log('Clicking Next to page 3...');
  const [resp3] = await Promise.all([
    page.waitForResponse(r => r.url().includes('page=3') && r.status() === 200),
    page.click('.referral-page-btn[aria-label="Next Page"]'),
  ]);
  await new Promise(r => setTimeout(r, 500));
  text = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  ind = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  count = await page.$$eval('tbody tr', rows => rows.length);
  console.log(`P3: text="${text}", ind="${ind}", rows=${count}`);

  console.log('Clicking Next to page 4...');
  const [resp4] = await Promise.all([
    page.waitForResponse(r => r.url().includes('page=4') && r.status() === 200),
    page.click('.referral-page-btn[aria-label="Next Page"]'),
  ]);
  await new Promise(r => setTimeout(r, 500));
  text = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  ind = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  count = await page.$$eval('tbody tr', rows => rows.length);
  console.log(`P4: text="${text}", ind="${ind}", rows=${count}`);

  await browser.close();
})();
