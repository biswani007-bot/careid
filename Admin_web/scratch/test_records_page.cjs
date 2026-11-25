const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const refreshToken = tokenData.refreshToken;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

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

  // Check what records are in the table
  const recordsInfo = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.records-table tbody tr')).map(r => r.innerText);
    return rows;
  });
  console.log('Records in table:', recordsInfo);

  // Click on the row to open the modal
  await page.evaluate(() => {
    const row = document.querySelector('.records-table tbody tr');
    if (row) row.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const modalPresent = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return !!modal;
  });
  console.log('Modal present:', modalPresent);

  await page.screenshot({ path: 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/current_modal_before.png' });
  console.log('Saved current_modal_before.png');

  await browser.close();
})();
