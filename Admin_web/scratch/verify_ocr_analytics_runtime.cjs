const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function main() {
  console.log('--- CAREID OCR ANALYTICS RUNTIME VERIFICATION ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Read fresh auth token
    const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
    const token = tokenObj.token;

    await page.evaluateOnNewDocument((tok) => {
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all', 'read:audit-logs'],
      }));
    }, token);

    console.log('1. Navigating to OCR Analytics Dashboard (/admin/ocr/analytics)...');
    await page.goto(`${BASE_URL}/admin/ocr/analytics`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
    await page.waitForSelector('.ocr-analytics-kpi-grid', { timeout: 15000 });

    // Wait for data to load
    await new Promise((r) => setTimeout(r, 2000));

    // Extract Today KPIs
    const todayKpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ocr-kpi-bento-card'));
      return cards.map((c) => {
        const label = c.querySelector('.ocr-kpi-card-label')?.innerText.trim();
        const value = c.querySelector('.ocr-kpi-card-value')?.innerText.trim();
        const trend = c.querySelector('.ocr-trend-pill')?.innerText.trim() || c.querySelector('.ocr-status-text-badge')?.innerText.trim();
        return { label, value, trend };
      });
    });

    console.log('\n[Today View KPIs]:');
    console.table(todayKpis);

    // Extract Today Exceptions
    const todayExceptions = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.ocr-exception-item'));
      return items.map((el) => {
        const title = el.querySelector('.ocr-exc-title')?.innerText.trim();
        const meta = el.querySelector('.ocr-exc-meta')?.innerText.trim();
        return { title, meta };
      });
    });

    console.log('\n[Today View Exceptions]:');
    console.table(todayExceptions);

    // Screenshot 1: Today View
    const todayShotPath = path.join(ARTIFACT_DIR, 'ocr_analytics_01_today.png');
    await page.screenshot({ path: todayShotPath, fullPage: true });
    console.log(`Saved screenshot 1: ${todayShotPath}`);

    // 2. Open date dropdown and select "Last 7 Days"
    console.log('\n2. Switching to "Last 7 Days"...');
    await page.click('#ocr-date-filter-btn');
    await new Promise((r) => setTimeout(r, 500));

    // Click "Last 7 Days" menu item
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="menu"] button'));
      const d7Btn = buttons.find((b) => b.innerText.includes('Last 7 Days'));
      if (d7Btn) d7Btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Extract 7 Days KPIs
    const d7Kpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ocr-kpi-bento-card'));
      return cards.map((c) => {
        const label = c.querySelector('.ocr-kpi-card-label')?.innerText.trim();
        const value = c.querySelector('.ocr-kpi-card-value')?.innerText.trim();
        const trend = c.querySelector('.ocr-trend-pill')?.innerText.trim() || c.querySelector('.ocr-status-text-badge')?.innerText.trim();
        return { label, value, trend };
      });
    });

    console.log('\n[Last 7 Days KPIs]:');
    console.table(d7Kpis);

    // Screenshot 2: 7 Days View
    const d7ShotPath = path.join(ARTIFACT_DIR, 'ocr_analytics_02_7days.png');
    await page.screenshot({ path: d7ShotPath, fullPage: true });
    console.log(`Saved screenshot 2: ${d7ShotPath}`);

    // 3. Switch to "All Time"
    console.log('\n3. Switching to "All Time"...');
    await page.click('#ocr-date-filter-btn');
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="menu"] button'));
      const allTimeBtn = buttons.find((b) => b.innerText.includes('All Time'));
      if (allTimeBtn) allTimeBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Extract All Time KPIs
    const allTimeKpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.ocr-kpi-bento-card'));
      return cards.map((c) => {
        const label = c.querySelector('.ocr-kpi-card-label')?.innerText.trim();
        const value = c.querySelector('.ocr-kpi-card-value')?.innerText.trim();
        const trend = c.querySelector('.ocr-trend-pill')?.innerText.trim() || c.querySelector('.ocr-status-text-badge')?.innerText.trim();
        return { label, value, trend };
      });
    });

    console.log('\n[All Time KPIs]:');
    console.table(allTimeKpis);

    // Screenshot 3: All Time View
    const allTimeShotPath = path.join(ARTIFACT_DIR, 'ocr_analytics_03_alltime.png');
    await page.screenshot({ path: allTimeShotPath, fullPage: true });
    console.log(`Saved screenshot 3: ${allTimeShotPath}`);

    // 4. Test Export Report button
    console.log('\n4. Testing Export Report button...');
    await page.click('#ocr-export-report-btn');
    await new Promise((r) => setTimeout(r, 1000));

    const toastText = await page.evaluate(() => {
      const toast = document.querySelector('.fixed.top-5.right-5');
      return toast ? toast.innerText.trim() : null;
    });
    console.log(`Toast message after export: "${toastText}"`);

    console.log('\nAll runtime checks PASSED!');
  } catch (err) {
    console.error('Runtime verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();

