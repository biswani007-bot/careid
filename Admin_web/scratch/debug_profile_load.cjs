const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const token = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json')).token;
  await page.evaluateOnNewDocument(t => {
    localStorage.setItem('careid_access_token', t);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
      status: 'ACTIVE',
      roles: ['ADMIN'],
      permissions: ['read:all']
    }));
  }, token);

  await page.goto('http://localhost:5174/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT:\n', html.slice(0, 400));
  await browser.close();
})();

