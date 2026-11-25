const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const refreshToken = tokenData.refreshToken;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, rTok) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    sessionStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, token, refreshToken);

  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  const rowText = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('.records-table tbody tr'));
    return trs.map(t => t.innerText);
  });
  console.log('Row text in table:', rowText);

  await browser.close();
})();

