const puppeteer = require('puppeteer-core');
const { getAdminToken } = require('./token_helper.cjs');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'admin-super-01',
      role: 'SUPER_ADMIN'
    }));
  }, token);

  await page.goto('http://localhost:5174/admin/patients', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.patients-kpi-value');
    return el && el.textContent.trim() === '37';
  });

  // Click the status dropdown
  await page.evaluate(() => {
    const pills = document.querySelectorAll('.patients-filter-pill');
    pills[0].click();
  });
  await delay(500);

  // Click Inactive
  await page.evaluate(() => {
    const menuItems = Array.from(document.querySelectorAll('.patients-filter-menu-item'));
    const inactive = menuItems.find(m => m.textContent.includes('Inactive'));
    if (inactive) inactive.click();
  });
  await delay(1000);

  const state = await page.evaluate(() => {
    return {
      pagination: document.querySelector('.patients-pagination-text')?.innerText?.trim(),
      rows: Array.from(document.querySelectorAll('.patients-table-row')).map(r => ({
        name: r.querySelector('.patients-name')?.innerText?.trim(),
        phone: r.querySelector('.patients-phone')?.innerText?.trim(),
        status: r.querySelector('.patients-badge-status')?.innerText?.trim()
      }))
    };
  });

  console.log('Filtered State:', state);
  await browser.close();
}

run().catch(console.error);

