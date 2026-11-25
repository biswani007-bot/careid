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
  
  page.on('response', async res => {
    if (res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch {}
      console.log(`[HTTP ${res.status()}] ${res.request().method()} ${res.url()} -> ${body.slice(0, 200)}`);
    }
  });

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
  await new Promise(r => setTimeout(r, 1000));

  // Type real patient UUID directly
  const patientUUID = '787e5187-7859-4320-bb1a-465a57dd086a';
  await page.type('#patientId', patientUUID);
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking submit...');
  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));

  const state = await page.evaluate(() => {
    const toast = document.querySelector('.fixed.top-5')?.textContent?.trim();
    const vault = localStorage.getItem('careid_admin_vault_attachments');
    return {
      toast,
      vault: vault ? JSON.parse(vault)[0] : null
    };
  });
  console.log('Final state:', JSON.stringify(state, null, 2));

  await browser.close();
})();

