const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testSearchWait() {
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

  console.log('Typing "John" into search...');
  await page.type('.users-search-input', 'John');

  // Wait for network response to complete
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('1 of 1') || text.includes('1 results');
  }, { timeout: 5000 });

  const rows = await page.$$eval('.users-table-row', els => els.map(el => ({
    name: el.querySelector('.user-name')?.textContent?.trim(),
    hvid: el.querySelector('.user-hvid')?.textContent?.trim()
  })));
  console.log('Rows displayed after search:', rows);

  await browser.close();
}

testSearchWait().catch(console.error);

