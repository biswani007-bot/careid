const puppeteer = require('puppeteer');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('=== CareID Admin Referral Comprehensive Verification Suite ===');
  const token = await getAdminToken();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  console.log('Step 1: Navigating to /admin/referrals...');
  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 32');
  }, { timeout: 15000 });

  // 1. Metric Cards
  const cards = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.referral-metric-card')).map(c => ({
      label: c.querySelector('.referral-metric-label')?.textContent?.trim(),
      val: c.querySelector('.referral-metric-value')?.textContent?.trim()
    }));
  });
  console.log('Summary Cards:', cards);

  // Screenshot 1: Page 1
  console.log('Capturing Page 1...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_01_page1_32.png') });

  // Screenshot 2: Page 2
  console.log('Navigating to Page 2...');
  await page.click('.referral-page-btn[aria-label="Next Page"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('11–20 of 32');
  }, { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_02_page2.png') });

  // Screenshot 3: Page 3
  console.log('Navigating to Page 3...');
  await page.click('.referral-page-btn[aria-label="Next Page"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('21–30 of 32');
  }, { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_03_page3.png') });

  // Screenshot 4: Page 4
  console.log('Navigating to Page 4...');
  await page.click('.referral-page-btn[aria-label="Next Page"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('31–32 of 32');
  }, { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_04_page4.png') });

  // Navigate back to Page 1
  console.log('Navigating back to Page 1...');
  await page.click('.referral-page-btn[aria-label="Previous Page"]');
  await new Promise(r => setTimeout(r, 600));
  await page.click('.referral-page-btn[aria-label="Previous Page"]');
  await new Promise(r => setTimeout(r, 600));
  await page.click('.referral-page-btn[aria-label="Previous Page"]');
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('1–10 of 32');
  }, { timeout: 10000 });

  // Screenshot 5: Filter Pending (23)
  console.log('Filtering by Pending...');
  const pendingCard = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.referral-metric-card')).find(c => c.textContent.includes('Pending'));
  });
  await pendingCard.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 23');
  }, { timeout: 10000 });
  const pendingText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  const pendingInd = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`Pending: Footer="${pendingText}", Ind="${pendingInd}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_05_pending_filter_23.png') });

  // Screenshot 6: Filter Accepted (4)
  console.log('Filtering by Accepted...');
  const acceptedCard = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.referral-metric-card')).find(c => c.textContent.includes('Accepted'));
  });
  await acceptedCard.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 4');
  }, { timeout: 10000 });
  const acceptedText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  const acceptedInd = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`Accepted: Footer="${acceptedText}", Ind="${acceptedInd}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_06_accepted_filter_4.png') });

  // Screenshot 7: Filter Cancelled (5)
  console.log('Filtering by Cancelled...');
  const cancelledCard = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.referral-metric-card')).find(c => c.textContent.includes('Cancelled'));
  });
  await cancelledCard.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 5');
  }, { timeout: 10000 });
  const cancelledText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  const cancelledInd = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`Cancelled: Footer="${cancelledText}", Ind="${cancelledInd}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_07_cancelled_filter_5.png') });

  // Reset to All
  console.log('Resetting filter to All...');
  const totalCard = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.referral-metric-card')).find(c => c.textContent.includes('Total Referrals'));
  });
  await totalCard.click();
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 32');
  }, { timeout: 10000 });

  // Screenshot 8: Search REF-2026-00032
  console.log('Searching for REF-2026-00032...');
  await page.evaluate(() => {
    const input = document.querySelector('.referral-toolbar-search-input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'REF-2026-00032');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 1');
  }, { timeout: 15000 });
  const searchText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  const searchInd = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`Search: Footer="${searchText}", Ind="${searchInd}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_08_search_filter.png') });

  // Screenshot 9: View Details Modal
  console.log('Opening Details modal...');
  await page.click('button[title*="View Clinical Notes"]');
  await page.waitForSelector('.referral-modal-card', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_09_details_modal.png') });
  
  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.referral-modal-header button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('.referral-toolbar-search-input');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 32');
  }, { timeout: 15000 });

  // Screenshot 10: Refresh Persistence
  console.log('Testing reload persistence...');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => {
    const el = document.querySelector('.referral-pagination-text');
    return el && el.textContent.includes('of 32');
  }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 600));
  const reloadText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  const reloadInd = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`Reload: Footer="${reloadText}", Ind="${reloadInd}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referrals_10_refresh_persistence.png') });

  await browser.close();
  console.log('=== Suite Completed Successfully with 10 Screenshots ===');
})();
