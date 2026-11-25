const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function inspectToolbar() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
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
  await new Promise(r => setTimeout(r, 1500));

  const data = await page.evaluate(() => {
    // 1. Top Navbar
    const topNavbar = document.querySelector('.reports-top-navbar');
    const topRight = document.querySelector('.reports-top-right');
    const searchBox = topRight?.querySelector('.bg-\\[\\#edeef0\\]') || topRight?.children[0];
    const iconBtns = Array.from(document.querySelectorAll('.reports-icon-btn'));
    const avatar = document.querySelector('.reports-admin-avatar');

    // 2. Filter Toolbar
    const headerRow = document.querySelector('.reports-header-row');
    const filtersGroup = document.querySelector('.reports-filters-group');
    const timeSegmented = document.querySelector('.reports-time-segmented');
    const dropdownBtns = Array.from(document.querySelectorAll('.reports-dropdown-btn'));
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Export'));

    const getBox = el => el ? {
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      height: window.getComputedStyle(el).height,
      display: window.getComputedStyle(el).display,
      alignItems: window.getComputedStyle(el).alignItems,
      justifyContent: window.getComputedStyle(el).justifyContent,
      gap: window.getComputedStyle(el).gap,
    } : null;

    return {
      topNavbar: getBox(topNavbar),
      topRight: getBox(topRight),
      searchBox: getBox(searchBox),
      iconBtns: iconBtns.map(getBox),
      avatar: getBox(avatar),
      headerRow: getBox(headerRow),
      filtersGroup: getBox(filtersGroup),
      timeSegmented: getBox(timeSegmented),
      dropdownBtns: dropdownBtns.map(getBox),
      exportBtn: getBox(exportBtn),
      // Canvas container
      canvas: getBox(document.querySelector('.reports-canvas'))
    };
  });

  console.log('LAYOUT INSPECTION:\n', JSON.stringify(data, null, 2));
  await browser.close();
}

inspectToolbar().catch(console.error);

