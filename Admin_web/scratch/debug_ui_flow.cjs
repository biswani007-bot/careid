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
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

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

  await page.goto('http://localhost:5174/admin/records/upload', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="file"]', { timeout: 10000 });

  const validPdfPath = path.resolve('scratch/test_files/valid_clinical_report.pdf');
  const fileInput = await page.$('input[type="file"]');
  await fileInput.uploadFile(validPdfPath);
  await new Promise(r => setTimeout(r, 1500));

  // Type real patient ID
  await page.type('#patientId', 'PT-CAREID-2026-0004');
  await new Promise(r => setTimeout(r, 1500));

  const state3 = await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"]');
    const patientVal = document.querySelector('#patientId').value;
    const resolved = document.querySelector('.text-emerald-700')?.textContent?.trim();
    return {
      submitDisabled: btn?.disabled,
      patientVal,
      resolved
    };
  });
  console.log('After patient ID typing:', state3);

  // Click submit
  console.log('Clicking submit...');
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 5000));

  const state4 = await page.evaluate(() => {
    const toast = document.querySelector('.fixed.top-5')?.textContent?.trim();
    const vault = localStorage.getItem('careid_admin_vault_attachments');
    return {
      toast,
      vault: vault ? JSON.parse(vault)[0] : null
    };
  });
  console.log('After submit result:', state4);

  await browser.close();
})();
