const puppeteer = require('puppeteer-core');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.token;

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'usr_superadmin',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator',
      email: 'superadmin@careid.test'
    }));
  }, token);

  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Check Page 1
  const page1 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const names = rows.map(r => r.querySelector('.doctors-doctor-name')?.textContent?.trim());
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    return { rowCount: rows.length, names, paginationText };
  });

  console.log('Page 1 result:', page1);

  // Click page 2 button
  const page2Clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.doctors-page-btn'));
    const btn2 = btns.find(b => b.textContent.trim() === '2');
    if (btn2) {
      btn2.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Page 2:', page2Clicked);

  await new Promise(r => setTimeout(r, 500));

  const page2 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const names = rows.map(r => r.querySelector('.doctors-doctor-name')?.textContent?.trim());
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    return { rowCount: rows.length, names, paginationText };
  });

  console.log('Page 2 result:', page2);

  await browser.close();
}

main().catch(console.error);

