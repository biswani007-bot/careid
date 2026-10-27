const puppeteer = require('puppeteer-core');

async function testRoutes() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  const routes = [
    '/admin/dashboard',
    '/admin/users',
    '/admin/users/user-1',
    '/admin/patients',
    '/admin/patients/pat-1',
    '/admin/patients/create',
  ];

  for (const route of routes) {
    try {
      await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 400));
      console.log('✓ Route OK:', route);
    } catch (e) {
      console.error('✗ Route Failed:', route, e.message);
    }
  }

  console.log('Console Errors across all screens:', errors.length);
  await browser.close();
}

testRoutes();
