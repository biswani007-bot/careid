const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });
  const btns = await page.$$('.user-action-btn');
  console.log('Found buttons on mobile:', btns.length);
  const btn = btns[0];
  const box = await btn.boundingBox();
  console.log('Button box before scroll:', box);
  await btn.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  const boxAfter = await btn.boundingBox();
  console.log('Button box after scroll:', boxAfter);
  await page.screenshot({ path: 'scratch/mobile_debug.png' });
  
  // Try clicking with JS dispatch vs puppeteer click
  await btn.evaluate(el => el.click());
  await new Promise(r => setTimeout(r, 500));
  const menu = await page.$('.user-actions-dropdown-menu');
  console.log('Menu found after evaluate click?', !!menu);
  if (menu) {
    const menuBox = await menu.boundingBox();
    console.log('Menu box:', menuBox);
  }
  await page.screenshot({ path: 'scratch/mobile_debug_clicked.png' });
  await browser.close();
})();
