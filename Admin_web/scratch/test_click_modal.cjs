const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => document.querySelector('.referral-pagination-text')?.textContent.includes('of 32'));

  console.log('Clicking FileText icon button...');
  await page.click('button[title*="View Clinical Notes"]');
  await new Promise(r => setTimeout(r, 600));

  const modal = await page.$('.referral-modal-card');
  console.log('Modal found?', Boolean(modal));
  if (modal) {
    const title = await page.$eval('.referral-modal-card h3', el => el.textContent.trim());
    console.log('Modal title:', title);
  }

  await browser.close();
})();
