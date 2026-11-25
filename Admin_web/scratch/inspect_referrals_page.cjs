const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken || tokenData.token;
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    sessionStorage.setItem('careid_user_session', JSON.stringify(user));
  }, token);

  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL:', page.url());

  const sidebarReferral = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    const refItem = items.find(i => i.innerText.includes('Referrals'));
    return refItem ? {
      text: refItem.innerText.replace(/\s+/g, ' ').trim(),
      badge: refItem.querySelector('.sidebar-badge')?.innerText?.trim() || null
    } : null;
  });
  console.log('Sidebar Referral Item:', sidebarReferral);

  const kpis = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.stats-card, .metric-card, .referral-stat-card, [class*="card"]'))
      .map(e => e.innerText.replace(/\s+/g, ' ').trim())
      .filter(t => t.includes('Referral') || t.includes('Pending') || t.includes('Accepted'));
  });
  console.log('KPI Cards found:', kpis);

  const tableState = await page.evaluate(() => {
    const table = document.querySelector('.referral-table');
    const wrapper = document.querySelector('.referral-table-wrapper');
    const footer = document.querySelector('.referral-pagination-footer');
    return {
      hasTable: !!table,
      tableWrapperText: wrapper ? wrapper.innerText.replace(/\s+/g, ' ') : null,
      footer: footer ? footer.innerText.replace(/\s+/g, ' ') : null
    };
  });
  console.log('Table state:', JSON.stringify(tableState, null, 2));

  await browser.close();
})();

