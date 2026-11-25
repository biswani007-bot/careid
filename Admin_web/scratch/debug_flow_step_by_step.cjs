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

  // TEST: Upload valid PDF
  console.log('1. Uploading valid file...');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(validPdfPath);
  await new Promise(r => setTimeout(r, 1000));

  // TEST: Type invalid patient
  console.log('2. Testing invalid patient...');
  await page.type('#patientId', 'PT-INVALID-99999');
  await new Promise(r => setTimeout(r, 500));
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  const invalidToast = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
  console.log('Invalid patient toast:', invalidToast);

  // TEST: Clear input and type valid patient
  console.log('3. Testing valid patient...');
  await page.evaluate(() => {
    const el = document.querySelector('#patientId');
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 500));

  // Type valid patient number
  await page.type('#patientId', 'PT-CAREID-2026-0004');
  await new Promise(r => setTimeout(r, 1500));

  const badge = await page.evaluate(() => document.querySelector('.text-emerald-700')?.textContent?.trim());
  console.log('Resolved patient badge:', badge);

  // Reselect file if cleared
  const hasFile = await page.evaluate(() => Boolean(document.querySelector('.bg-\\[\\#f0fdf4\\]')));
  console.log('Has verified file:', hasFile);

  console.log('4. Submitting valid record...');
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));

  const successToast = await page.evaluate(() => document.querySelector('.fixed.top-5')?.textContent?.trim());
  console.log('Success toast:', successToast);

  const vault = await page.evaluate(() => localStorage.getItem('careid_admin_vault_attachments'));
  console.log('Vault items count:', vault ? JSON.parse(vault).length : 0);

  await browser.close();
})();

