const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
  page.on('requestfailed', r => console.log('REQ FAILED:', r.url(), r.failure().errorText));
  page.on('response', async r => {
    if (r.url().includes('api')) {
      console.log('RESP:', r.status(), r.url());
    }
  });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  const html = await page.content();
  console.log('Contains pagination?', html.includes('referral-pagination-text'));
  console.log('Contains error?', html.includes('referral-error-state'));
  if (html.includes('referral-error-state')) {
    const errText = await page.$eval('.referral-error-state', el => el.textContent.trim());
    console.log('Error state text:', errText);
  }
  await browser.close();
})();

