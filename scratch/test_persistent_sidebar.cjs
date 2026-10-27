const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  // Helper to reliably set input value in React Hook Form
  async function setInput(selector, val) {
    await page.focus(selector);
    await page.evaluate((sel, v) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, val);
  }

  // 1. Log in
  console.log('Navigating to login page...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await setInput('#admin-email', 'admin@careid.com');
  await setInput('#admin-password', 'CareID2026!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname.includes('/admin/dashboard'), { timeout: 8000 });
  console.log('Successfully navigated to dashboard:', page.url());
  await new Promise(r => setTimeout(r, 400));

  // 2. Capture initial un-scrolled state
  const initialMetrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.careid-sidebar').getBoundingClientRect();
    const logo = document.querySelector('.sidebar-logo-container').getBoundingClientRect();
    const footer = document.querySelector('.sidebar-footer').getBoundingClientRect();
    const header = document.querySelector('.careid-top-navbar').getBoundingClientRect();
    const canvas = document.querySelector('.careid-main-canvas');
    return {
      windowScrollY: window.scrollY,
      canvasScrollTop: canvas.scrollTop,
      canvasScrollHeight: canvas.scrollHeight,
      canvasClientHeight: canvas.clientHeight,
      sidebar: { top: sidebar.top, left: sidebar.left, width: sidebar.width, height: sidebar.height },
      logo: { top: logo.top, left: logo.left, height: logo.height },
      footer: { top: footer.top, bottom: footer.bottom, height: footer.height },
      header: { top: header.top, left: header.left, height: header.height },
    };
  });

  console.log('Initial Layout Metrics (1366x768):', JSON.stringify(initialMetrics, null, 2));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'persistent_sidebar_top.png') });

  // 3. Scroll main canvas down to the bottom
  console.log('Scrolling main dashboard content to bottom...');
  await page.evaluate(() => {
    const canvas = document.querySelector('.careid-main-canvas');
    canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'instant' });
  });
  await new Promise(r => setTimeout(r, 300));

  // 4. Measure layout metrics after scroll
  const scrolledMetrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.careid-sidebar').getBoundingClientRect();
    const logo = document.querySelector('.sidebar-logo-container').getBoundingClientRect();
    const footer = document.querySelector('.sidebar-footer').getBoundingClientRect();
    const header = document.querySelector('.careid-top-navbar').getBoundingClientRect();
    const canvas = document.querySelector('.careid-main-canvas');
    return {
      windowScrollY: window.scrollY,
      canvasScrollTop: canvas.scrollTop,
      sidebar: { top: sidebar.top, left: sidebar.left, width: sidebar.width, height: sidebar.height },
      logo: { top: logo.top, left: logo.left, height: logo.height },
      footer: { top: footer.top, bottom: footer.bottom, height: footer.height },
      header: { top: header.top, left: header.left, height: header.height },
    };
  });

  console.log('Scrolled Layout Metrics (1366x768):', JSON.stringify(scrolledMetrics, null, 2));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'persistent_sidebar_scrolled.png') });

  // Assertions
  if (scrolledMetrics.windowScrollY !== 0) {
    throw new Error(`Window scrolled unexpectedly! window.scrollY = ${scrolledMetrics.windowScrollY}`);
  }
  if (scrolledMetrics.canvasScrollTop === 0) {
    throw new Error('Canvas failed to scroll vertically!');
  }
  if (Math.abs(scrolledMetrics.sidebar.top - initialMetrics.sidebar.top) > 0.5) {
    throw new Error('Sidebar top position shifted during scroll!');
  }
  if (Math.abs(scrolledMetrics.logo.top - initialMetrics.logo.top) > 0.5) {
    throw new Error('Sidebar logo shifted during scroll!');
  }
  if (Math.abs(scrolledMetrics.footer.bottom - initialMetrics.footer.bottom) > 1.5) {
    throw new Error('Sidebar footer detached from bottom during scroll!');
  }
  if (Math.abs(scrolledMetrics.header.top - initialMetrics.header.top) > 0.5) {
    throw new Error('Top header shifted during scroll!');
  }
  console.log('✔ VERIFICATION PASSED: Sidebar and Header remained 100% stationary while main canvas scrolled!');

  // 5. Test Short Viewport (1280x560) to verify middle nav scrolling
  console.log('Testing short viewport (1280x560) for middle nav list scrollability...');
  await page.setViewport({ width: 1280, height: 560 });
  await new Promise(r => setTimeout(r, 300));

  const shortMetrics = await page.evaluate(() => {
    const navList = document.querySelector('.sidebar-nav-list');
    return {
      navListScrollHeight: navList.scrollHeight,
      navListClientHeight: navList.clientHeight,
      isNavScrollable: navList.scrollHeight > navList.clientHeight,
    };
  });
  console.log('Short Viewport Nav Metrics:', JSON.stringify(shortMetrics, null, 2));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'persistent_sidebar_short_viewport.png') });

  // 6. Test Mobile Drawer (390x844)
  console.log('Testing mobile viewport (390x844) and drawer...');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 300));
  await page.click('.header-menu-toggle');
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'persistent_sidebar_mobile_drawer.png') });

  await browser.close();
  console.log('All persistent sidebar tests completed successfully!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
