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

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

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

    await page.goto('http://localhost:5173/admin/records/45d5ba2a-05bd-4a7f-ad34-fe9e677cff78', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
    await page.waitForSelector('.dicom-viewer-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    // Inspect layout and computed dimensions
    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('.record-details-grid');
      const leftCol = grid?.children[0];
      const rightCol = grid?.children[1];
      const masterCard = document.querySelector('.record-master-card');
      const lensCard = document.querySelector('.discipline-lens-card');
      const canvas = document.querySelector('.record-details-canvas');

      const gridRect = grid ? grid.getBoundingClientRect() : null;
      const leftRect = leftCol ? leftCol.getBoundingClientRect() : null;
      const rightRect = rightCol ? rightCol.getBoundingClientRect() : null;
      const masterRect = masterCard ? masterCard.getBoundingClientRect() : null;
      const lensRect = lensCard ? lensCard.getBoundingClientRect() : null;

      const hasHorizontalScrollbar = (canvas ? canvas.scrollWidth > canvas.clientWidth : false) ||
                                     document.documentElement.scrollWidth > window.innerWidth ||
                                     document.body.scrollWidth > window.innerWidth;

      const leftRatio = (gridRect && leftRect && rightRect && gridRect.width > 0)
        ? Math.round((leftRect.width / (leftRect.width + rightRect.width)) * 100)
        : null;

      const rightRatio = (gridRect && leftRect && rightRect && gridRect.width > 0)
        ? Math.round((rightRect.width / (leftRect.width + rightRect.width)) * 100)
        : null;

      return {
        canvasWidth: canvas ? Math.round(canvas.getBoundingClientRect().width) : 0,
        gridWidth: gridRect ? Math.round(gridRect.width) : 0,
        leftColWidth: leftRect ? Math.round(leftRect.width) : 0,
        rightColWidth: rightRect ? Math.round(rightRect.width) : 0,
        leftColRatio: leftRatio ? `${leftRatio}%` : 'Stacked',
        rightColRatio: rightRatio ? `${rightRatio}%` : 'Stacked',
        masterCardWidth: masterRect ? Math.round(masterRect.width) : 0,
        lensCardWidth: lensRect ? Math.round(lensRect.width) : 0,
        hasHorizontalScrollbar
      };
    });

    // Capture screenshot
    const shotPath = path.join(ARTIFACT_DIR, `record_details_redesign_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Saved screenshot: ${shotPath}`);

    results.push({
      viewport: vp.label,
      metrics,
      consoleErrors
    });

    await page.close();
  }

  // Next, test interactive buttons and controls
  console.log('\nTesting interactive controls & action buttons...');
  const testPage = await browser.newPage();
  await testPage.setViewport({ width: 1440, height: 900 });

  await testPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await testPage.evaluate((tok, rTok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', rTok);
    sessionStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
    sessionStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
    localStorage.setItem('careid_remember_me', 'true');
  }, token, refreshToken);

  await testPage.goto('http://localhost:5173/admin/records/45d5ba2a-05bd-4a7f-ad34-fe9e677cff78', { waitUntil: 'domcontentloaded' });
  await testPage.waitForSelector('.dicom-viewer-card', { timeout: 10000 });

  // 1. Test Zoom In
  await testPage.click('button[title="Zoom In"]');
  const zoomText = await testPage.evaluate(() => {
    const el = document.querySelector('button[title="Zoom In"]')?.previousElementSibling;
    return el ? el.innerText.trim() : '';
  });
  console.log('Zoom in level:', zoomText);

  // 2. Test Download Original File
  await testPage.click('.btn-details-download');
  await new Promise(r => setTimeout(r, 400));
  const downloadToast = await testPage.evaluate(() => {
    const toast = document.querySelector('.fixed.top-5.right-5');
    return toast ? toast.innerText.trim() : null;
  });
  console.log('Download original triggered toast:', downloadToast);

  // 3. Test Audit Log scroll
  await testPage.click('.btn-details-audit');
  await new Promise(r => setTimeout(r, 400));
  const auditSectionVisible = await testPage.evaluate(() => {
    const el = document.getElementById('audit-timeline-section');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.top <= window.innerHeight;
  });
  console.log('Audit section scrolled into view:', auditSectionVisible);

  // 4. Test Re-run OCR button
  await testPage.click('.btn-details-rerun');
  await new Promise(r => setTimeout(r, 500));
  const ocrToast = await testPage.evaluate(() => {
    const toast = document.querySelector('.fixed.top-5.right-5');
    return toast ? toast.innerText.trim() : null;
  });
  console.log('Rerun OCR triggered toast:', ocrToast);

  await testPage.close();
  await browser.close();

  console.log('\n--- RESPONSIVE REDESIGN VERIFICATION RESULTS ---');
  console.log(JSON.stringify(results, null, 2));
})();

