const fs = require('fs');
const puppeteer = require('puppeteer-core');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

async function snap() {
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify({ id: 'bc6f6875-434c-4050-b893-07343cc27986', roles: ['SUPER_ADMIN'] }));
  }, tokenData);

  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot buttons area
  const headingSection = await page.$('.referral-heading-row');
  if (headingSection) {
    await headingSection.screenshot({ path: 'scratch/current_overview_buttons.png' });
  }

  // Open modal
  const btn = await page.$('button[aria-label="Create New Referral"]');
  if (btn) await btn.click();
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'scratch/current_modal.png' });

  // Extract layout info of buttons
  const buttonMetrics = await page.evaluate(() => {
    const row = document.querySelector('.referral-heading-row');
    const btns = Array.from(row ? row.querySelectorAll('button') : []);
    return btns.map(b => ({
      text: b.innerText.trim(),
      className: b.className,
      rect: b.getBoundingClientRect(),
      scrollWidth: b.scrollWidth,
      clientWidth: b.clientWidth
    }));
  });
  console.log('Button metrics:', JSON.stringify(buttonMetrics, null, 2));

  await browser.close();
  console.log('Done!');
}
snap();

