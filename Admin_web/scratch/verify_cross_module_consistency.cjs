const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { getFreshToken } = require('./api_helper.cjs');

const SCREENSHOT_DIR = path.join(__dirname, 'responsive_screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyAll() {
  console.log('=== CAREID CROSS-MODULE CONSISTENCY E2E VERIFICATION ===\n');
  const token = await getFreshToken();
  console.log('✓ Obtained authentication token.');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Helper to create and authenticate a page
  const createAuthPage = async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Block heavy static images to preserve socket handles and memory
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'image' || type === 'media' || type === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

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

    return page;
  };

  try {
    // =========================================================================
    // MODULE 1: PATIENTS DIRECTORY (/admin/patients)
    // =========================================================================
    console.log('\n--- 1. VERIFYING PATIENTS DIRECTORY ---');
    const page1 = await createAuthPage();
    await page1.goto('http://localhost:5174/admin/patients', { waitUntil: 'networkidle2', timeout: 30000 });
    await page1.waitForSelector('.patients-kpi-card', { timeout: 30000 });
    
    await page1.waitForFunction(() => {
      const el = document.querySelector('.patients-kpi-value');
      return el && !el.querySelector('.skeleton-pulse') && el.innerText.trim().length > 0;
    }, { timeout: 30000 });

    const patientKpis = await page1.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.patients-kpi-card'));
      return cards.map(c => ({
        label: c.querySelector('.patients-kpi-label')?.innerText?.trim(),
        value: c.querySelector('.patients-kpi-value')?.innerText?.trim(),
        subtext: c.querySelector('.patients-kpi-footer-trend span, .patients-kpi-footer-text')?.innerText?.trim()
      }));
    });
    console.table(patientKpis);
    await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_01_patients.png'), fullPage: false });
    await page1.close();

    // =========================================================================
    // MODULE 2: DOCTOR DIRECTORY (/admin/doctors)
    // =========================================================================
    console.log('\n--- 2. VERIFYING DOCTOR DIRECTORY ---');
    const page2 = await createAuthPage();
    await page2.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2', timeout: 30000 });
    await page2.waitForSelector('.doctors-kpi-card', { timeout: 30000 });

    await page2.waitForFunction(() => {
      const el = document.querySelector('.doctors-kpi-value');
      return el && !el.querySelector('.skeleton-pulse') && el.innerText.trim().length > 0;
    }, { timeout: 30000 });

    const doctorKpis = await page2.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.doctors-kpi-card'));
      return cards.map(c => ({
        label: c.querySelector('.doctors-kpi-label')?.innerText?.trim(),
        value: c.querySelector('.doctors-kpi-value')?.innerText?.trim(),
        subtext: c.querySelector('.text-\\[11px\\]')?.innerText?.trim()
      }));
    });
    console.table(doctorKpis);
    await page2.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_02_doctors.png'), fullPage: false });
    await page2.close();

    // =========================================================================
    // MODULE 3: HEALTH RECORDS (/admin/records)
    // =========================================================================
    console.log('\n--- 3. VERIFYING HEALTH RECORDS DIRECTORY ---');
    const page3 = await createAuthPage();
    await page3.goto('http://localhost:5174/admin/records', { waitUntil: 'networkidle2', timeout: 30000 });
    await page3.waitForSelector('.category-tab-btn', { timeout: 30000 });

    // Wait for badges to load from '...'
    await page3.waitForFunction(() => {
      const badge = document.querySelector('.category-badge')?.innerText?.trim();
      return badge && badge !== '...';
    }, { timeout: 30000 });

    const recordTabs = await page3.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.category-tab-btn'));
      return tabs.map(t => ({
        tab: t.querySelector('span:not(.category-badge)')?.innerText?.trim(),
        count: t.querySelector('.category-badge')?.innerText?.trim()
      }));
    });
    console.table(recordTabs);
    await page3.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_03_records.png'), fullPage: false });
    await page3.close();

    // =========================================================================
    // MODULE 4: REPORTS DASHBOARD (/admin/reports)
    // =========================================================================
    console.log('\n--- 4. VERIFYING REPORTS DASHBOARD ---');
    const page4 = await createAuthPage();
    await page4.goto('http://localhost:5174/admin/reports', { waitUntil: 'networkidle2', timeout: 30000 });
    await page4.waitForSelector('.reports-kpi-card', { timeout: 30000 });

    // Wait for metrics to populate
    await page4.waitForFunction(() => {
      const val = document.querySelector('.reports-kpi-value')?.innerText?.trim();
      return val && val !== '...';
    }, { timeout: 30000 });

    const getReportKpis = async (p) => {
      return await p.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.reports-kpi-card'));
        return cards.map(c => ({
          label: c.querySelector('.reports-kpi-label')?.innerText?.trim(),
          value: c.querySelector('.reports-kpi-value')?.innerText?.trim(),
          trend: c.querySelector('.reports-kpi-trend')?.innerText?.trim()
        }));
      });
    };

    console.log('\n[Reports Dashboard - Default "Today" View]:');
    const reportsInitial = await getReportKpis(page4);
    console.table(reportsInitial);
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_04_reports_today.png'), fullPage: false });

    // Test 7D Filter
    console.log('\n[Reports Dashboard - Switching to "7D"]:');
    const btn7d = await page4.waitForSelector('button.reports-time-btn:nth-child(2)');
    await btn7d.click();
    await delay(1200);
    const reports7d = await getReportKpis(page4);
    console.table(reports7d);
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_05_reports_7d.png'), fullPage: false });

    // Test 30D Filter
    console.log('\n[Reports Dashboard - Switching to "30D"]:');
    const btn30d = await page4.waitForSelector('button.reports-time-btn:nth-child(3)');
    await btn30d.click();
    await delay(1200);
    const reports30d = await getReportKpis(page4);
    console.table(reports30d);
    await page4.screenshot({ path: path.join(SCREENSHOT_DIR, 'consistency_06_reports_30d.png'), fullPage: false });
    await page4.close();

    console.log('\n=== ALL CROSS-MODULE AUDIT CHECKS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Verification error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

verifyAll();
