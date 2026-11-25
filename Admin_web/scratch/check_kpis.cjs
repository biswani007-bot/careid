const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken;

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all'],
      status: 'ACTIVE'
    }));
  }, token);

  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const v = document.querySelector('.reports-kpi-value');
    return v && v.textContent.trim().length > 0;
  }, { timeout: 10000 });

  const kpis = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.reports-kpi-card')).map(card => ({
      label: card.querySelector('.reports-kpi-label')?.textContent?.trim(),
      val: card.querySelector('.reports-kpi-value')?.textContent?.trim(),
      trend: card.querySelector('.reports-kpi-trend')?.textContent?.trim(),
    }));
  });

  console.log('KPI Cards resolved:', JSON.stringify(kpis, null, 2));
  await page.screenshot({ path: 'scratch/reports_dashboard_desktop.png' });
  await browser.close();
}

main().catch(console.error);

