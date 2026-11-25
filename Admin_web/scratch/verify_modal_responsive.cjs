const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900, label: 'Desktop (1440px)' },
  { name: 'laptop_1280', width: 1280, height: 800, label: 'Laptop (1280px)' },
  { name: 'tablet_768', width: 768, height: 1024, label: 'Tablet (768px)' },
  { name: 'mobile_390', width: 390, height: 844, label: 'Mobile (390px)' },
  { name: 'small_mobile_375', width: 375, height: 667, label: 'Small Mobile (375px)' },
];

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const refreshToken = tokenData.refreshToken;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    // Set auth tokens in localStorage and sessionStorage
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
    await page.waitForSelector('tr.cursor-pointer', { timeout: 10000 });

    // Click on the record row to open the modal
    await page.click('tr.cursor-pointer');

    await page.waitForSelector('.record-modal-dialog', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    // Inspect layout and computed styles
    const metrics = await page.evaluate(() => {
      const dialog = document.querySelector('.record-modal-dialog');
      const header = document.querySelector('.record-modal-header');
      const body = document.querySelector('.record-modal-body');
      const footer = document.querySelector('.record-modal-footer');

      const dRect = dialog.getBoundingClientRect();
      const hRect = header.getBoundingClientRect();
      const bRect = body.getBoundingClientRect();
      const fRect = footer.getBoundingClientRect();

      // Section 2: Info strip
      const s2 = body.children[0]?.getBoundingClientRect();
      // Section 3: Cards
      const s3Cards = Array.from(body.children[1]?.children || []).map(c => {
        const r = c.getBoundingClientRect();
        return { width: r.width, height: r.height };
      });
      // Section 4: Clinical summary
      const s4 = body.children[2]?.getBoundingClientRect();
      // Section 5: Doc info cards
      const s5Cards = Array.from(body.children[3]?.children || []).map(c => {
        const r = c.getBoundingClientRect();
        return { width: r.width, height: r.height };
      });

      // Section 6: Footer buttons
      const closeBtn = document.querySelector('.btn-modal-close')?.getBoundingClientRect();
      const detailsBtn = document.querySelector('.btn-modal-details')?.getBoundingClientRect();
      const downloadBtn = document.querySelector('.btn-modal-download')?.getBoundingClientRect();

      const hasHorizontalScrollbar = document.documentElement.scrollWidth > window.innerWidth ||
                                     document.body.scrollWidth > window.innerWidth;

      return {
        dialog: { width: Math.round(dRect.width), height: Math.round(dRect.height) },
        header: { width: Math.round(hRect.width), height: Math.round(hRect.height) },
        body: { width: Math.round(bRect.width), height: Math.round(bRect.height), scrollHeight: body.scrollHeight },
        footer: { width: Math.round(fRect.width), height: Math.round(fRect.height) },
        section2: s2 ? { width: Math.round(s2.width), height: Math.round(s2.height) } : null,
        section3Cards: s3Cards.map(c => ({ width: Math.round(c.width), height: Math.round(c.height) })),
        section4: s4 ? { width: Math.round(s4.width), height: Math.round(s4.height) } : null,
        section5Cards: s5Cards.map(c => ({ width: Math.round(c.width), height: Math.round(c.height) })),
        buttons: {
          close: closeBtn ? { width: Math.round(closeBtn.width), height: Math.round(closeBtn.height) } : null,
          details: detailsBtn ? { width: Math.round(detailsBtn.width), height: Math.round(detailsBtn.height) } : null,
          download: downloadBtn ? { width: Math.round(downloadBtn.width), height: Math.round(downloadBtn.height) } : null,
        },
        hasHorizontalScrollbar
      };
    });

    // Capture screenshot
    const shotPath = path.join(ARTIFACT_DIR, `record_modal_${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${shotPath}`);

    results.push({ viewport: vp.label, metrics });
    await page.close();
  }

  // Next, test interaction: Close button, Download toast, View Full Details navigation
  console.log('\nTesting modal interactions...');
  const testPage = await browser.newPage();
  await testPage.setViewport({ width: 1440, height: 900 });

  await testPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await testPage.evaluate((tok, rTok) => {
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

  await testPage.goto('http://localhost:5173/admin/records', { waitUntil: 'domcontentloaded' });
  await testPage.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await testPage.waitForSelector('tr.cursor-pointer', { timeout: 10000 });

  // 1. Open modal and test Close button
  await testPage.click('tr.cursor-pointer');
  await testPage.waitForSelector('.record-modal-dialog', { timeout: 5000 });
  await testPage.click('.btn-modal-close');
  await new Promise(r => setTimeout(r, 400));
  const isClosed = await testPage.evaluate(() => !document.querySelector('.record-modal-dialog'));
  console.log('Close button closed modal:', isClosed);

  // 2. Re-open modal and test Download Document button
  await testPage.click('tr.cursor-pointer');
  await testPage.waitForSelector('.record-modal-dialog', { timeout: 5000 });
  await testPage.click('.btn-modal-download');
  await new Promise(r => setTimeout(r, 500));
  const toastText = await testPage.evaluate(() => {
    const toast = document.querySelector('.records-toast');
    return toast ? toast.innerText : null;
  });
  console.log('Download Document trigger toast:', toastText);

  // 3. Re-open modal and test View Full Details & Audit Trail navigation
  await testPage.click('tr.cursor-pointer');
  await testPage.waitForSelector('.record-modal-dialog', { timeout: 5000 });
  await testPage.click('.btn-modal-details');
  await new Promise(r => setTimeout(r, 1000));
  const currentNavUrl = testPage.url();
  console.log('Navigated URL on View Full Details:', currentNavUrl);

  await testPage.close();
  await browser.close();

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));
})();
