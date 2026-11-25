const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const refreshToken = tokenData.refreshToken;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, rTok) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    sessionStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, token, refreshToken);

  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click on the row to open the modal
  await page.evaluate(() => {
    const row = document.querySelector('.records-table tbody tr');
    if (row) row.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const modalDetails = await page.evaluate(() => {
    const backdrop = document.querySelector('.fixed.inset-0.z-50');
    if (!backdrop) return null;
    const card = backdrop.firstElementChild;
    const header = card?.children[0];
    const body = card?.children[1];
    const footer = card?.children[2];

    const cardRect = card?.getBoundingClientRect();
    const cardStyles = card ? window.getComputedStyle(card) : null;
    const bodyChildren = body ? Array.from(body.children).map((child, i) => {
      const rect = child.getBoundingClientRect();
      const style = window.getComputedStyle(child);
      return {
        index: i,
        className: child.className,
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        display: style.display,
        flexDirection: style.flexDirection,
        textSnippet: child.innerText.substring(0, 80).replace(/\n/g, ' ')
      };
    }) : [];

    return {
      cardRect: { width: cardRect.width, height: cardRect.height },
      maxWidth: cardStyles?.maxWidth,
      maxHeight: cardStyles?.maxHeight,
      padding: cardStyles?.padding,
      bodyChildren
    };
  });

  console.log('Modal layout details:', JSON.stringify(modalDetails, null, 2));

  await browser.close();
})();

