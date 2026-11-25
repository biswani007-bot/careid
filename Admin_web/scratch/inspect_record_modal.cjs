const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    const user = { id: 'bc6f6875-434c-4050-b893-07343cc27986', roles: ['SUPER_ADMIN'] };
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    sessionStorage.setItem('careid_user_session', JSON.stringify(user));
  }, token);

  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.records-table tbody tr, .btn-record-view', { timeout: 10000 });

  // Click on the first record view button or row
  const viewBtn = await page.$('.btn-record-view');
  if (viewBtn) {
    await viewBtn.click();
  } else {
    const row = await page.$('.records-table tbody tr');
    if (row) await row.click();
  }

  await page.waitForTimeout ? page.waitForTimeout(1000) : new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'current_modal_before.png') });
  console.log('Saved current_modal_before.png');

  await browser.close();
})();

