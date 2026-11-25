const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });

  const viewports = [
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '390x844', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });

    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      const user = { id: 'bc6f6875-434c-4050-b893-07343cc27986', roles: ['SUPER_ADMIN'] };
      localStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_user_session', JSON.stringify(user));
      sessionStorage.setItem('careid_user_session', JSON.stringify(user));
    }, token);

    await page.goto('http://localhost:5173/admin/records/medical', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.btn-category-add', { timeout: 10000 });

    const btn = await page.$('.btn-category-add');
    if (btn) {
      const box = await btn.boundingBox();
      console.log(`Viewport ${vp.name} - Button box:`, box);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `add_record_button_${vp.name}.png`) });
    console.log(`Saved screenshot for ${vp.name}`);

    await page.close();
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
})();

