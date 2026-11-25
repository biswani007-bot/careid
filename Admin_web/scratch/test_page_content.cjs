const puppeteer = require('puppeteer-core');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testPageContent() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('careid_admin_auth', JSON.stringify({
      isAuthenticated: true,
      user: {
        id: 'usr-admin-1',
        name: 'Evelyn Reed',
        email: 'evelyn.reed@careid.health',
        role: 'SUPER_ADMIN'
      }
    }));
  });

  await page.goto('http://localhost:5173/admin/security-compliance', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const url = page.url();
  const title = await page.title();
  const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText);
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));

  console.log('Current URL:', url);
  console.log('Title:', title);
  console.log('H1:', h1);
  console.log('Body Text:', bodyText);

  await browser.close();
}

testPageContent().catch(err => {
  console.error(err);
  process.exit(1);
});

