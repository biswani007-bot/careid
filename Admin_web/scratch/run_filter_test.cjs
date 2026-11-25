const fs = require('fs');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));

async function testFilter() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-web-security']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all']
    }));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row');
  console.log('Total initial rows:', await page.$$eval('.users-table-row', els => els.length));

  // Click 'Admins'
  const chips = await page.$$('.users-filter-chip');
  for (const c of chips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'Admins') {
      await c.click();
      console.log('Clicked Admins chip');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 800));
  const adminNames = await page.$$eval('.users-table-row .user-name', els => els.map(e => e.innerText.trim()));
  console.log('Admins filtered names:', adminNames);

  // Click 'All Users'
  for (const c of chips) {
    const text = await c.evaluate(el => el.innerText.trim());
    if (text === 'All Users') {
      await c.click();
      console.log('Clicked All Users chip');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 600));

  // Search 'Alice'
  await page.focus('.users-search-input');
  await page.type('.users-search-input', 'Alice');
  await new Promise(r => setTimeout(r, 2500));
  const searchVal = await page.$eval('.users-search-input', el => el.value);
  console.log('Search input value:', searchVal);
  const aliceRow = await page.$$eval('.users-table-row .user-name', els => els.map(e => e.innerText.trim()));
  console.log('Search Alice names:', aliceRow);

  await browser.close();
}
testFilter().catch(console.error);
