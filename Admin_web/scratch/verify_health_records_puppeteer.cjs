const puppeteer = require('puppeteer-core');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';

async function main() {
  console.log('--- STARTING HEALTH RECORDS & OCR BROWSER VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const refreshToken = tokenData.refreshToken || '';

  // Intercept before every navigation to set localStorage
  await page.evaluateOnNewDocument((tok, rTok) => {
    localStorage.setItem('careid_access_token', tok);
    if (rTok) localStorage.setItem('careid_refresh_token', rTok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
      email: 'admin@careid.test',
      phone: '+16505550002',
      status: 'ACTIVE',
      roles: ['ADMIN'],
      permissions: ['read:all', 'write:all', 'read:audit-logs']
    }));
  }, token, refreshToken);

  const routes = [
    { name: 'All Health Records', path: '/admin/records' },
    { name: 'Medical Records', path: '/admin/records/medical' },
    { name: 'Dental Records', path: '/admin/records/dental' },
    { name: 'Vision Records', path: '/admin/records/vision' },
    { name: 'OCR Verification Queue', path: '/admin/ocr/queue' },
    { name: 'OCR Analytics Dashboard', path: '/admin/ocr/analytics' },
    { name: 'OCR Rejected Queue', path: '/admin/ocr/rejected' },
  ];

  for (const r of routes) {
    console.log(`\nTesting ${r.name} at ${r.path}...`);
    await page.goto('http://localhost:5173' + r.path, { waitUntil: 'networkidle2' });
    try {
      await page.waitForFunction(
        () => !document.querySelector('.animate-spin'),
        { timeout: 8000 }
      );
    } catch {}
    await new Promise((res) => setTimeout(res, 500));

    const pageData = await page.evaluate(() => {
      const title = document.title;
      const h1 = document.querySelector('h1')?.innerText || document.querySelector('h2')?.innerText;
      const rows = document.querySelectorAll('tbody tr').length;
      const tbodyText = document.querySelector('tbody')?.innerText?.slice(0, 150).replace(/\n/g, ' ') || 'None';
      const kpis = Array.from(document.querySelectorAll('[class*="kpi"], [class*="stat"]'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0 && t.length < 30)
        .slice(0, 4);

      return { title, h1, rows, tbodyText, kpis };
    });

    console.log(`  Title: ${pageData.title}`);
    console.log(`  Heading: ${pageData.h1}`);
    console.log(`  Table Rows: ${pageData.rows}`);
    console.log(`  Content Preview: ${pageData.tbodyText}`);
  }

  await browser.close();
  console.log('\n--- VERIFICATION FINISHED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
