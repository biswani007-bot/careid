const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('--- Starting Admin Dashboard Metrics Verification ---');
  const token = await getAdminToken();
  if (!token) {
    throw new Error('Failed to retrieve valid admin token');
  }
  console.log('Got admin token successfully.');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pre-seed token in localStorage before load
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'admin@careid.com'
    }));
  }, token);

  console.log('Navigating to http://localhost:5174/admin/dashboard ...');
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'networkidle2' });

  // Wait for bento metrics grid to be populated
  await page.waitForSelector('.bento-metrics-grid', { timeout: 15000 });
  await page.waitForSelector('.bento-metric-card', { timeout: 15000 });

  // Wait extra 3 seconds for queries to settle
  await new Promise(r => setTimeout(r, 3000));

  const extractMetrics = async () => {
    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.bento-metric-card'));
      return cards.map(c => {
        const label = c.querySelector('.card-data-label')?.textContent?.trim();
        const value = c.querySelector('.card-data-value')?.textContent?.trim();
        const subtext = c.querySelector('.card-data-info span[style*="font-size: 11px"]')?.textContent?.trim();
        return { label, value, subtext };
      });
    });
  };

  let metrics = await extractMetrics();
  console.log('Extracted metrics before refresh:');
  console.table(metrics);

  // Take screenshot 1
  const screenshotDir = path.resolve('C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e');
  const screenshotPath1 = path.join(screenshotDir, 'dashboard_live_metrics_verified.png');
  await page.screenshot({ path: screenshotPath1, fullPage: false });
  console.log('Saved screenshot 1 to:', screenshotPath1);

  // Click the Live Refresh button
  console.log('Clicking Refresh Live Data button...');
  const refreshBtn = await page.$('.header-refresh-btn');
  if (refreshBtn) {
    await refreshBtn.click();
    console.log('Clicked refresh, waiting 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.warn('Refresh button not found!');
  }

  metrics = await extractMetrics();
  console.log('Extracted metrics after refresh:');
  console.table(metrics);

  const screenshotPath2 = path.join(screenshotDir, 'dashboard_metrics_after_refresh.png');
  await page.screenshot({ path: screenshotPath2, fullPage: false });
  console.log('Saved screenshot 2 to:', screenshotPath2);

  await browser.close();
  console.log('--- Verification Complete ---');
}

run().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
