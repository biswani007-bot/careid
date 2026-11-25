const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', m => {
    if (m.type() === 'error') console.log('BROWSER ERR:', m.text());
  });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  console.log('Navigating to referrals page...');
  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle2' });
  
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 32');
  }, { timeout: 15000 });

  const allCapturedIds = [];

  for (let p = 1; p <= 4; p++) {
    // Wait until indicator shows p / 4 and network is idle
    await page.waitForFunction(
      (targetInd) => {
        const el = document.querySelector('.referral-page-indicator');
        return el && el.textContent.includes(targetInd);
      },
      { timeout: 10000 },
      `${p} / 4`
    );

    const text = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
    const ind = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
    const rows = await page.$$eval('tbody tr', rs => rs.length);
    const ids = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));
    allCapturedIds.push(...ids);

    console.log(`PAGE ${p} -> Footer="${text}", Indicator="${ind}", Rows=${rows}, FirstID=${ids[0]}, LastID=${ids[ids.length - 1]}`);

    if (p < 4) {
      console.log(`Clicking Next to move to page ${p + 1}...`);
      const [response] = await Promise.all([
        page.waitForResponse(r => r.url().includes(`/api/v1/referrals?page=${p + 1}`) && r.status() === 200, { timeout: 15000 }),
        page.click('.referral-page-btn[aria-label="Next Page"]'),
      ]);
      await new Promise(r => setTimeout(r, 600));
    }
  }

  const uniqueIds = new Set(allCapturedIds);
  console.log(`TOTAL CAPTURED IDs: ${allCapturedIds.length}, UNIQUE IDs: ${uniqueIds.size}`);
  console.log('Unique matches total 32?', uniqueIds.size === 32);

  await browser.close();
  console.log('Finished page loop successfully!');
})();
