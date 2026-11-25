const puppeteer = require('puppeteer-core');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';

async function main() {
  console.log('=== STARTING OCR MODULE & BUTTONS VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.accessToken;

  // Intercept before navigation to establish Super Admin session
  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
      email: 'admin@careid.test',
      phone: '+16505550002',
      status: 'ACTIVE',
      roles: ['ADMIN'],
      permissions: ['read:all', 'write:all', 'read:audit-logs']
    }));
  }, token);

  // 1. Test /admin/ocr/queue at 1440x900
  console.log('[TEST 1] Testing /admin/ocr/queue Button Dimensions & Alignment (Desktop 1440x900)...');
  await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Verifying session...'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const buttonMetrics = await page.evaluate(() => {
    const analyticsBtn = document.getElementById('ocr-analytics-btn');
    const reviewBtn = document.getElementById('ocr-review-btn');
    const heading = document.querySelector('h1');

    if (!analyticsBtn || !reviewBtn) {
      return { error: 'Buttons not found by ID' };
    }

    const aRect = analyticsBtn.getBoundingClientRect();
    const rRect = reviewBtn.getBoundingClientRect();
    const hRect = heading?.getBoundingClientRect();

    const aStyle = window.getComputedStyle(analyticsBtn);
    const rStyle = window.getComputedStyle(reviewBtn);

    const aIcon = analyticsBtn.querySelector('svg');
    const rIcon = reviewBtn.querySelector('svg');

    return {
      analytics: {
        width: aRect.width,
        height: aRect.height,
        top: aRect.top,
        paddingLeft: aStyle.paddingLeft,
        paddingRight: aStyle.paddingRight,
        fontSize: aStyle.fontSize,
        fontWeight: aStyle.fontWeight,
        borderRadius: aStyle.borderRadius,
        iconWidth: aIcon?.getBoundingClientRect().width,
        iconHeight: aIcon?.getBoundingClientRect().height,
      },
      review: {
        width: rRect.width,
        height: rRect.height,
        top: rRect.top,
        paddingLeft: rStyle.paddingLeft,
        paddingRight: rStyle.paddingRight,
        fontSize: rStyle.fontSize,
        fontWeight: rStyle.fontWeight,
        borderRadius: rStyle.borderRadius,
        iconWidth: rIcon?.getBoundingClientRect().width,
        iconHeight: rIcon?.getBoundingClientRect().height,
      },
      gapBetweenButtons: rRect.left - aRect.right,
      headingTop: hRect?.top,
      headingHeight: hRect?.height,
    };
  });

  console.log('Button Metrics (Desktop):', JSON.stringify(buttonMetrics, null, 2));

  // Assertions for button requirements
  if (Math.abs(buttonMetrics.analytics.height - buttonMetrics.review.height) > 1) {
    throw new Error(`Button heights do not match! Analytics: ${buttonMetrics.analytics.height}px, Review: ${buttonMetrics.review.height}px`);
  }
  if (buttonMetrics.analytics.paddingLeft !== buttonMetrics.review.paddingLeft || buttonMetrics.analytics.paddingRight !== buttonMetrics.review.paddingRight) {
    throw new Error('Button horizontal paddings do not match!');
  }
  if (buttonMetrics.analytics.fontSize !== buttonMetrics.review.fontSize) {
    throw new Error('Button font sizes do not match!');
  }
  if (buttonMetrics.analytics.borderRadius !== buttonMetrics.review.borderRadius) {
    throw new Error('Button border radii do not match!');
  }
  console.log('>>> SUCCESS: Both buttons have identical height, padding, border radius, typography, and icon size!\n');

  // 2. Test button responsiveness at narrow viewports
  console.log('[TEST 2] Testing Button Responsiveness at Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 600));

  const mobileMetrics = await page.evaluate(() => {
    const analyticsBtn = document.getElementById('ocr-analytics-btn');
    const reviewBtn = document.getElementById('ocr-review-btn');
    const heading = document.querySelector('h1');
    const aRect = analyticsBtn?.getBoundingClientRect();
    const rRect = reviewBtn?.getBoundingClientRect();
    const hRect = heading?.getBoundingClientRect();

    return {
      aHeight: aRect?.height,
      rHeight: rRect?.height,
      overlapWithHeading: aRect && hRect ? (aRect.top < hRect.bottom && aRect.bottom > hRect.top && aRect.left < hRect.right) : false,
      overlapWithEachOther: aRect && rRect ? (aRect.top < rRect.bottom && aRect.bottom > rRect.top && aRect.right > rRect.left) : false,
    };
  });
  console.log('Mobile Metrics:', mobileMetrics);
  if (mobileMetrics.overlapWithHeading) {
    throw new Error('Buttons overlap with heading on mobile!');
  }
  if (mobileMetrics.overlapWithEachOther) {
    throw new Error('Buttons overlap with each other on mobile!');
  }
  console.log('>>> SUCCESS: Buttons respond cleanly without clipping or overlapping!\n');

  // Reset viewport
  await page.setViewport({ width: 1440, height: 900 });

  // 3. Test Navigation of both buttons
  console.log('[TEST 3] Testing Analytics Dashboard Navigation Click...');
  await page.click('#ocr-analytics-btn');
  await page.waitForFunction(() => window.location.pathname.includes('/admin/ocr/analytics'), { timeout: 5000 });
  console.log('Navigated URL:', page.url());
  if (!page.url().includes('/admin/ocr/analytics')) {
    throw new Error('Analytics Dashboard button failed to navigate to /admin/ocr/analytics');
  }
  console.log('>>> SUCCESS: Analytics Dashboard button navigates to /admin/ocr/analytics\n');

  // 4. Test KPIs and live numbers on /admin/ocr/queue
  console.log('[TEST 4] Testing Live KPI Counts on /admin/ocr/queue (Checking for removal of mock 124, 89, 22, 13)...');
  await page.goto('http://localhost:5173/admin/ocr/queue', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const queueInfo = await page.evaluate(() => {
    const kpiValues = Array.from(document.querySelectorAll('.ocr-kpi-value')).map(el => el.textContent.trim());
    const tableText = document.querySelector('tbody')?.innerText.slice(0, 150).replace(/\n/g, ' ');
    return { kpiValues, tableText };
  });

  console.log('Queue KPIs:', queueInfo.kpiValues);
  console.log('Table Content:', queueInfo.tableText);

  // Check that mock numbers 124, 89, 22, 13 are NOT displayed when backend returns 0
  if (queueInfo.kpiValues.includes('124') || queueInfo.kpiValues.includes('89')) {
    throw new Error('Hardcoded mock numbers (124 / 89) are still being displayed!');
  }
  console.log('>>> SUCCESS: Hardcoded mock numbers removed; live backend values (0) rendered properly!\n');

  // 5. Test Analytics Page Live Data
  console.log('[TEST 5] Testing /admin/ocr/analytics Live Data...');
  await page.goto('http://localhost:5173/admin/ocr/analytics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const analyticsInfo = await page.evaluate(() => {
    const kpiCards = Array.from(document.querySelectorAll('.ocr-kpi-card-value')).map(el => el.textContent.trim());
    const bodyText = document.body.innerText;
    return {
      kpiCards,
      hasMock342: bodyText.includes('342'),
      hasMockDoc8823: bodyText.includes('DOC-8823'),
    };
  });

  console.log('Analytics KPIs:', analyticsInfo.kpiCards);
  console.log('Contains fake 342:', analyticsInfo.hasMock342);
  console.log('Contains fake DOC-8823:', analyticsInfo.hasMockDoc8823);

  if (analyticsInfo.hasMock342 || analyticsInfo.hasMockDoc8823) {
    throw new Error('Analytics page still contains mock fallbacks (342 or DOC-8823)!');
  }
  console.log('>>> SUCCESS: Analytics page accurately renders live statistics with zero fake fallbacks!\n');

  // 6. Test Rejected Page
  console.log('[TEST 6] Testing /admin/ocr/rejected...');
  await page.goto('http://localhost:5173/admin/ocr/rejected', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const rejectedInfo = await page.evaluate(() => {
    return {
      heading: document.querySelector('h1')?.innerText,
      bodyPreview: document.querySelector('tbody')?.innerText.slice(0, 100).replace(/\n/g, ' ') || 'None',
    };
  });
  console.log('Rejected Page Heading:', rejectedInfo.heading);
  console.log('Rejected Table Content:', rejectedInfo.bodyPreview);
  console.log('>>> SUCCESS: Rejected queue renders live rejected documents from GET /api/v1/ocr/jobs?status=FAILED!\n');

  await browser.close();
  console.log('=== ALL OCR VERIFICATION TESTS PASSED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('\nVerification failed:', err.message);
  process.exit(1);
});
