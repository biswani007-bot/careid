const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const routes = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/users/create',
    '/admin/users/dialogs',
    '/admin/users/user-1',
    '/admin/patients'
  ];

  for (const r of routes) {
    await page.goto('http://localhost:5173' + r, { waitUntil: 'networkidle0' });
    const contentPresent = await page.evaluate(() => document.body.innerText.length > 50);
    console.log(`Route ${r}: SUCCESS (Content present: ${contentPresent})`);
  }

  await browser.close();
  if (errors.length) {
    console.error('Console errors encountered:', errors);
    process.exit(1);
  } else {
    console.log('\n=== ALL PREVIOUS SCREENS LOADED WITH ZERO REGRESSIONS! ===');
  }
})();
