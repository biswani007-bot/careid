const puppeteer = require('puppeteer');
const { getFreshToken } = require('./api_helper.cjs');

(async () => {
  const token = await getFreshToken();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'admin-super-01',
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'superadmin@careid.com'
    }));
  }, token);

  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#patientSearchInput');

  console.log('Typing Marc into #patientSearchInput...');
  await page.type('#patientSearchInput', 'Marc');

  // Wait for item to appear
  await page.waitForSelector('.patient-dropdown-item', { timeout: 10000 });
  const text = await page.evaluate(() => document.querySelector('.patient-dropdown-item').innerText.replace(/\s+/g, ' ').trim());
  console.log('Result for Marc:', text);

  await browser.close();
})();

