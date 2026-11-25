const puppeteer = require('puppeteer');
const fs = require('fs');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

async function debug() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+16505550001'
    }));
  }, tokenData.accessToken);

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));

  const hasRow = await page.$('.users-table-row');
  console.log('Has .users-table-row?', !!hasRow);
  if (!hasRow) {
    const errorText = await page.evaluate(() => {
      const errEl = document.querySelector('.users-table-error-cell');
      return errEl ? errEl.innerText : document.body.innerText.slice(0, 300);
    });
    console.log('Error text or body:', errorText);
  } else {
    const rowCount = await page.$$eval('.users-table-row', els => els.length);
    console.log('Row count:', rowCount);
  }
  await browser.close();
}

debug().catch(console.error);

