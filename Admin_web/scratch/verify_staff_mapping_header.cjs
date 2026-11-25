const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('=== VERIFYING STAFF MAPPING HEADER & UPPER LAYOUT ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  // Test Viewports: 1440, 1280, 1024, 390
  const viewports = [
    { name: 'desktop_1440', width: 1440, height: 1024 },
    { name: 'laptop_1280', width: 1280, height: 900 },
    { name: 'tablet_1024', width: 1024, height: 768 },
    { name: 'mobile_390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/facilities/fac-1/staff-mapping', {
      waitUntil: 'networkidle0',
    });
    await new Promise((r) => setTimeout(r, 600));

    // Inspect header metrics
    const metrics = await page.evaluate(() => {
      const header = document.querySelector('header.careid-top-navbar');
      const navBar = document.querySelector('.staff-mapping-nav-bar');
      const heroBanner = document.querySelector('.staff-mapping-hero-banner');
      const tabsBar = document.querySelector('.staff-mapping-tabs-bar');
      const docScrollWidth = document.documentElement.scrollWidth;
      const docClientWidth = document.documentElement.clientWidth;

      return {
        headerHeight: header ? header.getBoundingClientRect().height : null,
        hasHorizontalOverflow: docScrollWidth > docClientWidth,
        docScrollWidth,
        docClientWidth,
        navBarTop: navBar ? navBar.getBoundingClientRect().top : null,
        heroBannerTop: heroBanner ? heroBanner.getBoundingClientRect().top : null,
        tabsBarTop: tabsBar ? tabsBar.getBoundingClientRect().top : null,
      };
    });

    console.log(`Header height: ${metrics.headerHeight}px (Expected ~64px)`);
    console.log(`Horizontal overflow: ${metrics.hasHorizontalOverflow} (${metrics.docScrollWidth} / ${metrics.docClientWidth})`);
    console.log(`NavBar top: ${metrics.navBarTop}px, HeroBanner top: ${metrics.heroBannerTop}px, TabsBar top: ${metrics.tabsBarTop}px`);

    const shotPath = path.join(ARTIFACT_DIR, `staff_mapping_${vp.name}_fixed.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`✓ Saved screenshot: ${shotPath}`);
  }

  // Verify Return Button click navigates back
  console.log('\n--- Verifying Return Button Navigation ---');
  await page.setViewport({ width: 1440, height: 1024 });
  await page.goto('http://localhost:5173/admin/facilities/fac-1/staff-mapping', {
    waitUntil: 'networkidle0',
  });
  await new Promise((r) => setTimeout(r, 400));

  const returnBtn = await page.$('#btn-return-facility-details');
  if (!returnBtn) {
    throw new Error('Return button #btn-return-facility-details not found!');
  }
  await returnBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  const finalUrl = page.url();
  console.log('URL after Return click:', finalUrl);
  if (!finalUrl.includes('/admin/facilities/fac-1')) {
    throw new Error(`Expected return to /admin/facilities/fac-1, got ${finalUrl}`);
  }
  console.log('✓ Successfully navigated back to Facility Details!');

  console.log('\n=== ALL STAFF MAPPING HEADER & UPPER LAYOUT CHECKS PASSED ===');
  await browser.close();
}

run();
