const puppeteer = require('puppeteer');
const fs = require('fs');
const BASE_URL = 'http://localhost:5174';

async function debugPage() {
  const cachedAuth = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cachedAuth.token;
  const refreshToken = cachedAuth.refreshToken;
  const userSession = cachedAuth.user;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, userSession }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', token);
    sessionStorage.setItem('careid_refresh_token', refreshToken);
    sessionStorage.setItem('careid_user_session', JSON.stringify(userSession));
  }, { token, refreshToken, userSession });

  await page.goto(`${BASE_URL}/admin/patients/create`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL:', page.url());
  const html = await page.content();
  console.log('HTML snippet:', html.slice(0, 500));
  await page.screenshot({ path: 'scratch/debug_page.png' });
  await browser.close();
}

debugPage().catch(console.error);

