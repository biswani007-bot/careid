const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json')).token;
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('careid_access_token', t);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
      status: 'ACTIVE',
      roles: ['ADMIN'],
      permissions: ['read:all'],
    }));
  }, token);

  await page.goto('http://localhost:5174/admin/ocr/queue', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.ocr-queue-table tbody tr');

  // Type in the search input
  const input = await page.$('header input');
  if (input) {
    await input.type('bf760a70');
    // Wait until loading indicator disappears
    await new Promise((r) => setTimeout(r, 2000));
    await page.waitForFunction(
      () => !document.querySelector('.ocr-queue-table tbody')?.innerText.includes('Loading'),
      { timeout: 10000 }
    );
  }

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ocr-queue-table tbody tr')).map((r) => {
      const badge = r.querySelector('.ocr-status-badge');
      return {
        text: r.innerText.replace(/\n+/g, ' '),
        badgeText: badge ? badge.innerText.trim() : null,
        badgeClass: badge ? badge.className : null,
      };
    });
  });

  console.log('Rows found:', rows);
  await browser.close();
})();
