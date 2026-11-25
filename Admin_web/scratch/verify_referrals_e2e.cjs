const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

(async () => {
  console.log('--- Starting CareID Referral E2E Verification ---');
  const token = await getAdminToken();
  console.log('Obtained admin token.');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Inject token before navigation
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('token', tok);
    localStorage.setItem('auth_token', tok);
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  console.log('Navigating to http://localhost:5174/admin/referrals...');
  await page.goto('http://localhost:5174/admin/referrals', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Check metric cards
  const metrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.map(c => {
      const label = c.querySelector('.referral-metric-label')?.textContent?.trim();
      const val = c.querySelector('.referral-metric-value')?.textContent?.trim();
      return { label, val };
    });
  });
  console.log('Referral Metric Cards:', metrics);

  // 2. Check Page 1
  let footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  let pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  let rowCount = await page.$$eval('tbody tr', rows => rows.length);
  let p1Ids = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));

  console.log(`PAGE 1: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
  console.log('Sample IDs on Page 1:', p1Ids.slice(0, 3));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_01_page1_32.png') });

  // 3. Click Next -> Page 2
  const nextBtnSelector = '.referral-page-btn[aria-label="Next Page"]';
  await page.click(nextBtnSelector);
  await new Promise(r => setTimeout(r, 1000));

  footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  rowCount = await page.$$eval('tbody tr', rows => rows.length);
  let p2Ids = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));

  console.log(`PAGE 2: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
  console.log('Sample IDs on Page 2:', p2Ids.slice(0, 3));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_02_page2.png') });

  // 4. Click Next -> Page 3
  await page.click(nextBtnSelector);
  await new Promise(r => setTimeout(r, 1000));

  footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  rowCount = await page.$$eval('tbody tr', rows => rows.length);
  let p3Ids = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));

  console.log(`PAGE 3: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
  console.log('Sample IDs on Page 3:', p3Ids.slice(0, 3));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_03_page3.png') });

  // 5. Click Next -> Page 4
  await page.click(nextBtnSelector);
  await new Promise(r => setTimeout(r, 1000));

  footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  rowCount = await page.$$eval('tbody tr', rows => rows.length);
  let p4Ids = await page.$$eval('tbody tr td:first-child', cells => cells.map(c => c.textContent.trim()));

  console.log(`PAGE 4: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
  console.log('IDs on Page 4:', p4Ids);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_04_page4.png') });

  // Verify uniqueness of all 32 IDs
  const allIds = [...p1Ids, ...p2Ids, ...p3Ids, ...p4Ids];
  const uniqueIds = new Set(allIds);
  console.log(`TOTAL COLLECTED IDs across 4 pages: ${allIds.length}, UNIQUE IDs: ${uniqueIds.size}`);

  // 6. Test Card Filter: Pending (23)
  const pendingCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.find(c => c.textContent.includes('Pending'));
  });
  if (pendingCard) {
    await pendingCard.click();
    await new Promise(r => setTimeout(r, 1200));
    footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
    pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
    rowCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`PENDING FILTER: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_05_pending_card.png') });
  }

  // 7. Test Card Filter: Accepted (4)
  const acceptedCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.find(c => c.textContent.includes('Accepted'));
  });
  if (acceptedCard) {
    await acceptedCard.click();
    await new Promise(r => setTimeout(r, 1200));
    footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
    pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
    rowCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`ACCEPTED FILTER: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_06_accepted_card.png') });
  }

  // 8. Test Card Filter: Cancelled (5)
  const cancelledCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.find(c => c.textContent.includes('Cancelled'));
  });
  if (cancelledCard) {
    await cancelledCard.click();
    await new Promise(r => setTimeout(r, 1200));
    footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
    pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
    rowCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`CANCELLED FILTER: Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_07_cancelled_card.png') });
  }

  // 9. Reset filter: Click Total Referrals
  const totalCard = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.find(c => c.textContent.includes('Total Referrals'));
  });
  if (totalCard) {
    await totalCard.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  // 10. Test Search for "REF-2026-00032"
  const searchInput = await page.$('input[placeholder*="Search by patient, doctor, ID"]');
  if (searchInput) {
    await searchInput.click({ clickCount: 3 });
    await searchInput.type('REF-2026-00032');
    await new Promise(r => setTimeout(r, 1200));
    footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
    pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
    rowCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`SEARCH "REF-2026-00032": Footer="${footerText}", Indicator="${pageIndicator}", Rows=${rowCount}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_08_search.png') });

    // Clear search
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 1000));
  }

  // 11. Refresh persistence test
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  footerText = await page.$eval('.referral-pagination-text', el => el.textContent.trim());
  pageIndicator = await page.$eval('.referral-page-indicator', el => el.textContent.trim());
  console.log(`AFTER RELOAD: Footer="${footerText}", Indicator="${pageIndicator}"`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_09_refresh_persistence.png') });

  await browser.close();
  console.log('--- Verification Complete ---');
})();

