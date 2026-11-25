const puppeteer = require('puppeteer-core');
const path = require('path');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testSearch() {
  const token = (require('./cached_admin_token.json')).token;
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['*']
    }));
  }, token);

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Search 'John' by setting input value and dispatching event
  console.log('Searching for "John"...');
  await page.evaluate(() => {
    const input = document.querySelector('.users-search-input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'John');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1000));

  const results = await page.$$eval('.users-table-row', els => els.map(el => ({
    name: el.querySelector('.user-name')?.textContent?.trim(),
    role: el.querySelector('.user-role-badge')?.textContent?.trim(),
    phone: el.querySelector('.user-phone')?.textContent?.trim(),
    hvid: el.querySelector('.user-hvid')?.textContent?.trim()
  })));
  console.log('Results for "John":', results);

  // Search 'Jenkins'
  console.log('\nSearching for "Jenkins"...');
  await page.evaluate(() => {
    const input = document.querySelector('.users-search-input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'Jenkins');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1000));

  const results2 = await page.$$eval('.users-table-row', els => els.map(el => ({
    name: el.querySelector('.user-name')?.textContent?.trim(),
    role: el.querySelector('.user-role-badge')?.textContent?.trim(),
    phone: el.querySelector('.user-phone')?.textContent?.trim(),
    hvid: el.querySelector('.user-hvid')?.textContent?.trim()
  })));
  console.log('Results for "Jenkins":', results2);

  // Search '0001'
  console.log('\nSearching for "0001"...');
  await page.evaluate(() => {
    const input = document.querySelector('.users-search-input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, '0001');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 1000));

  const results3 = await page.$$eval('.users-table-row', els => els.map(el => ({
    name: el.querySelector('.user-name')?.textContent?.trim(),
    role: el.querySelector('.user-role-badge')?.textContent?.trim(),
    phone: el.querySelector('.user-phone')?.textContent?.trim(),
    hvid: el.querySelector('.user-hvid')?.textContent?.trim()
  })));
  console.log('Results for "0001":', results3);

  await browser.close();
}

testSearch().catch(console.error);

