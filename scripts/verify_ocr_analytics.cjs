const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

async function verifyOcrAnalytics() {
  console.log('--- STARTING OCR ANALYTICS VERIFICATION ---');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // TEST 1: Desktop (1440x900)
  console.log('\n1. Testing Desktop Viewport (1440x900)...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/ocr/analytics', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ocr-analytics-bento', { timeout: 10000 });

  // Capture top
  const desktopTopPath = path.join(MEDIA_DIR, 'ocr_analytics_desktop_top.png');
  await page.screenshot({ path: desktopTopPath });
  console.log(`Saved screenshot: ${desktopTopPath}`);

  // Measure initial scroll
  const initDesktop = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    return {
      scrollTop: canvas?.scrollTop,
      scrollHeight: canvas?.scrollHeight,
      clientHeight: canvas?.clientHeight,
    };
  });
  console.log('Initial Desktop state:', initDesktop);
  if (initDesktop.scrollHeight <= initDesktop.clientHeight) {
    throw new Error('Canvas is not scrollable on Desktop (scrollHeight <= clientHeight)');
  }

  // Scroll down to the bottom
  console.log('Scrolling to bottom of Desktop canvas...');
  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    canvas?.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));

  const scrolledDesktop = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    const exceptionsCard = document.querySelector('.ocr-exceptions-list');
    const chart = document.querySelector('.ocr-chart-container');
    const rectExc = exceptionsCard?.getBoundingClientRect();
    const rectChart = chart?.getBoundingClientRect();

    return {
      scrollTop: canvas?.scrollTop,
      scrollHeight: canvas?.scrollHeight,
      clientHeight: canvas?.clientHeight,
      exceptionsBottom: rectExc?.bottom,
      chartBottom: rectChart?.bottom,
      exceptionsVisible: rectExc && rectExc.top < window.innerHeight && rectExc.bottom <= window.innerHeight + 10,
    };
  });
  console.log('Scrolled Desktop state:', scrolledDesktop);
  if (scrolledDesktop.scrollTop === 0) {
    throw new Error('Canvas failed to scroll down on Desktop');
  }

  const desktopBottomPath = path.join(MEDIA_DIR, 'ocr_analytics_desktop_bottom.png');
  await page.screenshot({ path: desktopBottomPath });
  console.log(`Saved screenshot: ${desktopBottomPath}`);

  // TEST 2: Laptop (1280x800)
  console.log('\n2. Testing Laptop Viewport (1280x800)...');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    canvas?.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));

  const laptopInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    return {
      scrollTop: canvas?.scrollTop,
      scrollHeight: canvas?.scrollHeight,
      clientHeight: canvas?.clientHeight,
      canScroll: (canvas?.scrollHeight || 0) > (canvas?.clientHeight || 0),
    };
  });
  console.log('Laptop state:', laptopInfo);
  if (!laptopInfo.canScroll || laptopInfo.scrollTop === 0) {
    throw new Error('Laptop viewport failed to scroll properly');
  }

  const laptopBottomPath = path.join(MEDIA_DIR, 'ocr_analytics_laptop_bottom.png');
  await page.screenshot({ path: laptopBottomPath });
  console.log(`Saved screenshot: ${laptopBottomPath}`);

  // TEST 3: Tablet (1024x768 - 1 column bento layout)
  console.log('\n3. Testing Tablet Viewport (1024x768)...');
  await page.setViewport({ width: 1024, height: 768 });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    canvas?.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));

  const tabletInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    const exceptionsCard = document.querySelector('.ocr-exceptions-list');
    const rect = exceptionsCard?.getBoundingClientRect();
    return {
      scrollTop: canvas?.scrollTop,
      scrollHeight: canvas?.scrollHeight,
      clientHeight: canvas?.clientHeight,
      isBottomVisible: rect && rect.bottom <= window.innerHeight + 10,
    };
  });
  console.log('Tablet state:', tabletInfo);
  if (tabletInfo.scrollTop === 0 || !tabletInfo.isBottomVisible) {
    throw new Error('Tablet viewport failed to scroll down to bottom sections');
  }

  const tabletBottomPath = path.join(MEDIA_DIR, 'ocr_analytics_tablet_bottom.png');
  await page.screenshot({ path: tabletBottomPath });
  console.log(`Saved screenshot: ${tabletBottomPath}`);

  // TEST 4: Mobile (375x667)
  console.log('\n4. Testing Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 400));

  const mobileOverflow = await page.evaluate(() => {
    const body = document.body;
    return {
      bodyScrollWidth: body.scrollWidth,
      windowInnerWidth: window.innerWidth,
      hasPageOverflow: body.scrollWidth > window.innerWidth,
    };
  });
  console.log('Mobile overflow check:', mobileOverflow);
  if (mobileOverflow.hasPageOverflow) {
    throw new Error(`Mobile viewport has whole-page overflow: ${mobileOverflow.bodyScrollWidth} > ${mobileOverflow.windowInnerWidth}`);
  }

  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    canvas?.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileBottomPath = path.join(MEDIA_DIR, 'ocr_analytics_mobile_bottom.png');
  await page.screenshot({ path: mobileBottomPath });
  console.log(`Saved screenshot: ${mobileBottomPath}`);

  // TEST 5: Interactive Features & Navigation
  console.log('\n5. Testing interactive features...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    canvas?.scrollTo({ top: 0, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 300));

  // Time range selector
  console.log('Testing Time Range dropdown...');
  await page.select('select[aria-label="Time range filter"]', 'Last 7 Days');
  await new Promise(r => setTimeout(r, 300));
  await page.select('select[aria-label="Time range filter"]', 'Today');
  await new Promise(r => setTimeout(r, 300));

  // Export report button
  console.log('Testing Export Report button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const exportBtn = btns.find(b => b.innerText.includes('Export Report'));
    exportBtn?.click();
  });
  await new Promise(r => setTimeout(r, 300));
  const toastText = await page.evaluate(() => document.querySelector('.fixed.top-5')?.innerText);
  console.log('Export Toast:', toastText);
  if (!toastText || !toastText.includes('export initiated')) {
    throw new Error('Export report toast was not triggered');
  }

  // Processing Queue button navigation
  console.log('Testing Processing Queue button navigation...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const queueBtn = btns.find(b => b.innerText.includes('Processing Queue'));
    queueBtn?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const currentUrl = page.url();
  console.log('Navigated URL:', currentUrl);
  if (!currentUrl.includes('/admin/ocr/queue')) {
    throw new Error(`Expected navigation to /admin/ocr/queue, but current URL is ${currentUrl}`);
  }

  // Navigate back to analytics
  await page.goto('http://localhost:5173/admin/ocr/analytics', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.ocr-analytics-bento');

  // View All button navigation
  console.log('Testing View All exceptions navigation...');
  await page.evaluate(() => {
    const viewAllBtn = document.querySelector('.ocr-analytics-card button');
    viewAllBtn?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const viewAllUrl = page.url();
  console.log('View All URL:', viewAllUrl);
  if (!viewAllUrl.includes('/admin/ocr/queue?status=Rejected')) {
    throw new Error(`Expected navigation to /admin/ocr/queue?status=Rejected, got ${viewAllUrl}`);
  }

  // Console errors check
  console.log('\n6. Checking console errors...');
  console.log('Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error(`Found ${consoleErrors.length} console errors`);
  }

  console.log('\n--- ALL OCR ANALYTICS VERIFICATIONS PASSED SUCCESSFULLY! ---');
  await browser.close();
}

verifyOcrAnalytics().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
