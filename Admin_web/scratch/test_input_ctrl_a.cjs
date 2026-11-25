const puppeteer = require('puppeteer');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

(async () => {
  const token = await getFreshToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));

  // Seed session token
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

  // Navigate to Upload page
  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="file"]');

  const validPdfPath = path.resolve('scratch/test_files/valid_clinical_report.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(validPdfPath);
  await new Promise(r => setTimeout(r, 1000));

  // Type invalid
  await page.focus('#patientId');
  await page.type('#patientId', 'PT-INVALID-99999', { delay: 30 });
  await new Promise(r => setTimeout(r, 400));
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  const t1 = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
  console.log('Invalid test toast:', t1);

  // Clear with Ctrl+A Backspace
  await page.focus('#patientId');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');

  // Type valid
  await page.type('#patientId', 'PT-CAREID-2026-0004', { delay: 30 });
  await new Promise(r => setTimeout(r, 1500));

  const resolved = await page.evaluate(() => document.querySelector('.text-emerald-700')?.textContent?.trim());
  console.log('Resolved badge after typing valid:', resolved);

  // Submit valid
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));

  const t2 = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
  console.log('Valid upload toast:', t2);

  await browser.close();
})();

