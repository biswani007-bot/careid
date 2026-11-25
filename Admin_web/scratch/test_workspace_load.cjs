const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

async function testWorkspaceLoad() {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'admin@careid.com'
    }));
  }, token);

  const testUrl = 'http://localhost:5174/admin/ocr/verify/bf760a70-ab5b-4390-b0f4-d2da9b6006c8';
  console.log('Navigating to:', testUrl);
  await page.goto(testUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const pageDetails = await page.evaluate(() => {
    return {
      currentUrl: window.location.href,
      h1: document.querySelector('h1')?.textContent?.trim(),
      h2: document.querySelector('h2')?.textContent?.trim(),
      badge: document.querySelector('.ocr-header-id-pill, .ocr-header-status-pill, .ocr-status-pill-review')?.textContent?.trim(),
      patientNameVal: document.querySelector('input[name="patientName"]')?.value,
      patientIdVal: document.querySelector('input[name="patientId"]')?.value,
      hasForm: !!document.querySelector('form, .ocr-verification-form'),
    };
  });

  console.log('Page details:', pageDetails);
  await browser.close();
}

testWorkspaceLoad().catch(console.error);

