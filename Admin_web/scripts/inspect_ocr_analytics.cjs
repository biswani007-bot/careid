const puppeteer = require('puppeteer-core');

async function inspectOcrAnalytics() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173/admin/ocr/analytics ...');
  await page.goto('http://localhost:5173/admin/ocr/analytics', { waitUntil: 'networkidle0' });

  const info = await page.evaluate(() => {
    const canvas = document.querySelector('.ocr-analytics-canvas');
    const mainWrapper = document.querySelector('.careid-main-wrapper');
    const sections = Array.from(canvas?.children || []).map((el, i) => {
      const rect = el.getBoundingClientRect();
      const tagName = el.tagName;
      const className = el.className;
      return {
        index: i,
        tagName,
        className,
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        visibleIn900px: rect.top < 900 && rect.bottom > 0,
        fullyVisibleIn900px: rect.top >= 0 && rect.bottom <= 900
      };
    });

    return {
      windowHeight: window.innerHeight,
      windowScrollY: window.scrollY,
      canvasScrollHeight: canvas ? canvas.scrollHeight : null,
      canvasClientHeight: canvas ? canvas.clientHeight : null,
      canvasScrollTop: canvas ? canvas.scrollTop : null,
      mainWrapperHeight: mainWrapper ? mainWrapper.clientHeight : null,
      mainWrapperScrollHeight: mainWrapper ? mainWrapper.scrollHeight : null,
      sections
    };
  });

  console.log('Inspection result:', JSON.stringify(info, null, 2));

  const screenshotPath = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage\\inspect_ocr_analytics_reproduce.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
}

inspectOcrAnalytics().catch(err => {
  console.error('Error during inspectOcrAnalytics:', err);
  process.exit(1);
});
