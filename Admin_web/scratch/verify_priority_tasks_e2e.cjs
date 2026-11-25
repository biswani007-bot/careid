const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== STARTING HIGH PRIORITY TASKS LIVE DATA E2E VERIFICATION ===');
  const token = await getAdminToken();
  if (!token) throw new Error('No admin token found');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate session
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      role: 'SUPER_ADMIN',
      fullName: 'Super Administrator',
      email: 'admin@careid.com'
    }));
  }, token);

  // 2. Navigate to Admin Dashboard
  console.log('Navigating to http://localhost:5174/admin/dashboard ...');
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.tasks-table', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Extract table rows from Page 1
  const extractRows = async () => {
    return await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.tasks-table tbody tr'));
      return rows.map(r => {
        const type = r.querySelector('.task-type-cell span:last-child')?.textContent?.trim();
        const entity = r.querySelector('.task-entity-text')?.textContent?.trim();
        const submitted = r.querySelector('.task-time-text')?.textContent?.trim();
        const status = r.querySelector('.task-status-badge')?.textContent?.trim();
        const priority = r.querySelector('.task-status-cell span[style*="font-size: 10px"]')?.textContent?.trim();
        const action = r.querySelector('.task-action-cell button')?.textContent?.trim();
        return { type, entity, submitted, status, priority, action };
      });
    });
  };

  let rowsP1 = await extractRows();
  console.log('\n--- Extracted Rows on Page 1 ---');
  console.table(rowsP1);

  // Verification checks on Page 1
  const statuses = rowsP1.map(r => r.status);
  console.log('Statuses found on Page 1:', statuses);

  const hasCriticalStatus = statuses.includes('Critical');
  console.log(`Did any row have fake 'Critical' status? ${hasCriticalStatus ? 'YES (FAIL)' : 'NO (PASS - all rows use truthful status!)'}`);

  const hasApprovedOrRejected = statuses.some(s => s === 'Approved' || s === 'Rejected' || s === 'Completed');
  console.log(`Did any row have Approved/Rejected status? ${hasApprovedOrRejected ? 'YES (FAIL)' : 'NO (PASS - strictly pending!)'}`);

  // Screenshot Page 1
  const screenshot1 = path.join(ARTIFACTS_DIR, 'priority_tasks_page1_verified.png');
  await page.screenshot({ path: screenshot1, fullPage: false });
  console.log('Saved Page 1 screenshot to:', screenshot1);

  // Test Pagination: Click Next Page
  console.log('\nTesting Pagination: Clicking Next Page...');
  const nextBtn = await page.$('.tasks-page-btn:last-child');
  if (nextBtn) {
    await nextBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    const rowsP2 = await extractRows();
    console.log('--- Extracted Rows on Page 2 ---');
    console.table(rowsP2);

    const paginationText = await page.$eval('.tasks-pagination-text', el => el.textContent.trim());
    console.log('Pagination text:', paginationText);

    const screenshot2 = path.join(ARTIFACTS_DIR, 'priority_tasks_page2_verified.png');
    await page.screenshot({ path: screenshot2, fullPage: false });
    console.log('Saved Page 2 screenshot to:', screenshot2);

    // Click Previous Page
    console.log('Clicking Previous Page...');
    const prevBtn = await page.$('.tasks-page-btn:first-child');
    await prevBtn.click();
    await new Promise(r => setTimeout(r, 1000));
  } else {
    console.warn('Next button not found!');
  }

  // Test Review Action on an OCR task
  console.log('\nTesting Review action on first OCR task...');
  const firstOcrRowAction = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.tasks-table tbody tr'));
    const ocrRow = rows.find(r => r.querySelector('.task-type-cell')?.textContent?.includes('OCR'));
    if (ocrRow) {
      const btn = ocrRow.querySelector('.task-action-cell button');
      const entity = ocrRow.querySelector('.task-entity-text')?.textContent?.trim();
      return { found: true, entity };
    }
    return { found: false };
  });

  if (firstOcrRowAction.found) {
    console.log('Clicking Review button for entity:', firstOcrRowAction.entity);
    // Find button and click
    const ocrReviewBtn = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('.tasks-table tbody tr'));
      const ocrRow = rows.find(r => r.querySelector('.task-type-cell')?.textContent?.includes('OCR'));
      return ocrRow ? ocrRow.querySelector('.task-action-cell button') : null;
    });

    if (ocrReviewBtn) {
      await ocrReviewBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      await page.waitForSelector('h1', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 2000));

      console.log('Current URL after review click:', page.url());
      const pageHeading = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() || '');
      console.log('Page Heading:', pageHeading);

      const screenshotReview = path.join(ARTIFACTS_DIR, 'priority_tasks_ocr_review_workspace.png');
      await page.screenshot({ path: screenshotReview, fullPage: false });
      console.log('Saved OCR Review Workspace screenshot to:', screenshotReview);
    }
  }

  // Navigate back to dashboard and test Live Refresh
  console.log('\nNavigating back to http://localhost:5174/admin/dashboard ...');
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.header-refresh-btn', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking Refresh Live Data button...');
  await page.click('.header-refresh-btn');
  await new Promise(r => setTimeout(r, 3000));

  const refreshedRows = await extractRows();
  console.log('Rows after Live Refresh:', refreshedRows.length);
  console.table(refreshedRows.slice(0, 3));

  const screenshotRefreshed = path.join(ARTIFACTS_DIR, 'priority_tasks_refreshed_live.png');
  await page.screenshot({ path: screenshotRefreshed, fullPage: false });
  console.log('Saved Refreshed Dashboard screenshot to:', screenshotRefreshed);

  await browser.close();
  console.log('=== E2E VERIFICATION COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
