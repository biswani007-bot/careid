const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { getAdminToken } = require('./token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  console.log('=== DEBUGGING /admin/records PAGE ===\n');
  const token = await getAdminToken();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor network
  const networkLogs = [];
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1/')) {
      networkLogs.push({
        status: res.status(),
        method: res.request().method(),
        url: url.replace('https://360api.vnvision.in', '')
      });
      console.log(`[NET] ${res.status()} ${res.request().method()} ${url.replace('https://360api.vnvision.in', '')}`);
    }
  });

  // Monitor console
  page.on('console', msg => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  // Auth setup
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'admin-super-01',
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'superadmin@careid.com'
    }));
  }, token);

  console.log('Navigating to http://localhost:5174/admin/records...');
  await page.goto('http://localhost:5174/admin/records', { waitUntil: 'networkidle2' });
  await delay(3000);

  const state = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.records-tab, .records-tab-item, button[role="tab"]')).map(t => t.innerText?.trim());
    const kpis = Array.from(document.querySelectorAll('.records-kpi-card, .records-stat-card, [data-node-id]')).map(c => c.innerText?.trim()).slice(0, 10);
    const pagination = document.querySelector('.records-pagination, .pagination')?.innerText?.trim();
    const rows = document.querySelectorAll('tbody tr, .records-table-row').length;
    const emptyState = document.querySelector('.empty-state, .records-empty')?.innerText?.trim();
    const bodyText = document.body.innerText;
    return { tabs, rows, pagination, emptyState, hasZero: bodyText.includes('0 records') || bodyText.includes('All Records (0)') };
  });

  console.log('Page state:', state);

  // Take screenshot
  const ssPath = path.join(__dirname, 'responsive_screenshots', 'records_page_debug.png');
  await page.screenshot({ path: ssPath, fullPage: true });
  console.log('Saved screenshot to:', ssPath);

  await browser.close();
}

run().catch(console.error);

