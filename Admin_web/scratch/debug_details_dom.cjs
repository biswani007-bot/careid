const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, rTok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
    sessionStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
  }, tokenData.accessToken, tokenData.refreshToken);

  await page.goto('http://localhost:5173/admin/records/45d5ba2a-05bd-4a7f-ad34-fe9e677cff78', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    return {
      url: window.location.href,
      bodySnippet: document.body.innerText.substring(0, 400),
      hasViewer: !!document.querySelector('.dicom-viewer-card'),
      hasCanvas: !!document.querySelector('.record-details-canvas'),
      hasMasterCard: !!document.querySelector('.record-master-card'),
      classes: Array.from(document.querySelectorAll('[class]')).slice(0, 15).map(el => el.className)
    };
  });
  console.log('Page info:', info);

  await browser.close();
})();

