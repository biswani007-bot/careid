const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, rTok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
    sessionStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
  }, tokenData.accessToken, tokenData.refreshToken);

  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('tr.cursor-pointer', { timeout: 10000 });
  await page.click('tr.cursor-pointer');
  await page.waitForSelector('.record-modal-dialog', { timeout: 5000 });

  await page.click('.btn-modal-download');
  await page.waitForSelector('[role="status"]', { timeout: 5000 });

  const toastText = await page.evaluate(() => {
    const el = document.querySelector('[role="status"]');
    return el ? el.innerText.trim() : null;
  });
  console.log('SUCCESS - Toast detected:', toastText);

  await browser.close();
})();

