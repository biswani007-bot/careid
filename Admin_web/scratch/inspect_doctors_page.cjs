const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let token = null;
  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    token = tokenData.token || tokenData.access_token;
    console.log('Found token, length:', token?.length);
  } catch (e) {
    console.log('Error reading token file:', e.message);
  }

  // Go to root first to seed localStorage
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  if (token) {
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
  }

  // Now navigate to /admin/doctors
  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Page URL after navigation:', page.url());

  const info = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    const paginationText = document.querySelector('.doctors-pagination-text')?.textContent?.trim();
    const paginationControls = Array.from(document.querySelectorAll('.doctors-page-btn')).map(b => b.textContent.trim() || b.getAttribute('aria-label'));

    // Bounding boxes and styles
    const canvas = document.querySelector('.doctors-main-canvas');
    const tableCard = document.querySelector('.doctors-table-card');
    const tableWrapper = document.querySelector('.doctors-table-wrapper');
    const table = document.querySelector('.doctors-table');
    const pagination = document.querySelector('.doctors-pagination');

    const getMetrics = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        rect: { top: rect.top, bottom: rect.bottom, height: rect.height, width: rect.width },
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        offsetHeight: el.offsetHeight,
        overflow: style.overflow,
        overflowY: style.overflowY,
        maxHeight: style.maxHeight,
        height: style.height,
      };
    };

    const rowDetails = rows.map((r, i) => {
      const rect = r.getBoundingClientRect();
      const name = r.querySelector('.doctors-doctor-name')?.textContent?.trim();
      const hvid = r.querySelector('.doctors-doctor-hvid')?.textContent?.trim();
      return {
        index: i + 1,
        name,
        hvid,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        isVisibleInViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
      };
    });

    return {
      windowHeight: window.innerHeight,
      rowCount: rows.length,
      paginationText,
      paginationControls,
      canvas: getMetrics(canvas),
      tableCard: getMetrics(tableCard),
      tableWrapper: getMetrics(tableWrapper),
      table: getMetrics(table),
      pagination: getMetrics(pagination),
      rowDetails,
    };
  });

  console.log('Diagnosis Result:\n', JSON.stringify(info, null, 2));

  const screenshotPath = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/doctors_directory_page1.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
