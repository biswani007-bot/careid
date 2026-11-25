const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, rTok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
    sessionStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
  }, tokenData.accessToken, tokenData.refreshToken);

  await page.goto('http://localhost:5173/admin/records/45d5ba2a-05bd-4a7f-ad34-fe9e677cff78', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/record_details_current_1440.png', fullPage: true });
  console.log('Saved baseline fullPage screenshot: record_details_current_1440.png');

  await browser.close();
})();

