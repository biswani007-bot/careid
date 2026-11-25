const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  console.log('--- STARTING USER DETAILS SIDEBAR VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  try {
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // 1. Desktop Viewport (1280x800)
    console.log('1. Navigating to /admin/users/user-1 at 1280x800...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });

    // Verify elements exist
    const sidebar = await page.$('.careid-sidebar');
    if (!sidebar) throw new Error('Sidebar element not found');

    const logo = await page.$('.sidebar-logo');
    if (!logo) throw new Error('Logo element not found');

    const activeItem = await page.$('.sidebar-nav-item.active');
    const activeText = await page.evaluate(el => el.textContent, activeItem);
    console.log('Active nav item:', activeText.trim());

    const ctaBtn = await page.$('.sidebar-cta-btn');
    const ctaText = await page.evaluate(el => el.textContent, ctaBtn);
    console.log('Sidebar CTA button text:', ctaText.trim());

    const logoutBtn = await page.$('.sidebar-logout-btn');
    const logoutText = await page.evaluate(el => el.textContent, logoutBtn);
    console.log('Logout button text:', logoutText.trim());

    const ocrBadge = await page.$('.sidebar-badge-red');
    const ocrBadgeText = await page.evaluate(el => el.textContent, ocrBadge);
    console.log('OCR red badge text:', ocrBadgeText.trim());

    const referralsBadge = await page.$('.sidebar-badge-amber');
    const referralsBadgeText = await page.evaluate(el => el.textContent, referralsBadge);
    console.log('Referrals amber badge text:', referralsBadgeText.trim());

    const divider = await page.$('.sidebar-divider');
    console.log('Divider present:', !!divider);

    // Check footer bounding box
    const footerBox = await page.$eval('.sidebar-footer', el => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        height: rect.height,
        width: rect.width,
        windowHeight: window.innerHeight,
      };
    });
    console.log('Sidebar footer box at 1280x800:', footerBox);

    const ssDesktop = path.join(ARTIFACT_DIR, 'user_details_sidebar_desktop_1280x800.png');
    await page.screenshot({ path: ssDesktop });
    console.log('Saved desktop screenshot:', ssDesktop);

    // 2. Test Main Content Scroll (Verify Sidebar stays fixed)
    console.log('2. Scrolling main content container...');
    const initialSidebarY = await page.$eval('.careid-sidebar', el => el.getBoundingClientRect().top);
    await page.$eval('.user-details-main', el => {
      el.scrollTop = 500;
    });
    await new Promise(r => setTimeout(r, 200));
    const scrolledSidebarY = await page.$eval('.careid-sidebar', el => el.getBoundingClientRect().top);
    const mainScrollTop = await page.$eval('.user-details-main', el => el.scrollTop);
    console.log(`Main content scrollTop: ${mainScrollTop}, Sidebar initial top: ${initialSidebarY}, Sidebar after scroll top: ${scrolledSidebarY}`);
    if (initialSidebarY !== scrolledSidebarY) {
      throw new Error('Sidebar moved when main content scrolled!');
    }

    // 3. Test Viewport Height Adaptability (1280x600 - smaller height)
    console.log('3. Testing compact viewport height (1280x600)...');
    await page.setViewport({ width: 1280, height: 600 });
    await new Promise(r => setTimeout(r, 200));
    const footerBox600 = await page.$eval('.sidebar-footer', el => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        windowHeight: window.innerHeight,
      };
    });
    console.log('Sidebar footer box at 1280x600:', footerBox600);
    const ssCompact = path.join(ARTIFACT_DIR, 'user_details_sidebar_compact_1280x600.png');
    await page.screenshot({ path: ssCompact });
    console.log('Saved compact height screenshot:', ssCompact);

    // 4. Test Tablet Viewport (1024x768)
    console.log('4. Testing Tablet Viewport (1024x768)...');
    await page.setViewport({ width: 1024, height: 768 });
    await new Promise(r => setTimeout(r, 200));
    const ssTablet = path.join(ARTIFACT_DIR, 'user_details_sidebar_tablet_1024x768.png');
    await page.screenshot({ path: ssTablet });
    console.log('Saved tablet screenshot:', ssTablet);

    // 5. Test Mobile Drawer (390x844)
    console.log('5. Testing Mobile Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 200));
    // Click hamburger to open drawer
    const hamburger = await page.$('.user-details-hamburger');
    await hamburger.click();
    await new Promise(r => setTimeout(r, 300));
    const ssMobileDrawer = path.join(ARTIFACT_DIR, 'user_details_sidebar_mobile_drawer_390x844.png');
    await page.screenshot({ path: ssMobileDrawer });
    console.log('Saved mobile drawer screenshot:', ssMobileDrawer);

    // 6. Test Logout Navigation
    console.log('6. Testing Logout action...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });
    const logout = await page.$('.sidebar-logout-btn');
    await logout.click();
    await new Promise(r => setTimeout(r, 400));
    const currentUrl = page.url();
    console.log('Current URL after logout:', currentUrl);
    if (!currentUrl.endsWith('/') && !currentUrl.endsWith('/login')) {
      throw new Error(`Logout failed! URL is ${currentUrl}`);
    }

    console.log('--- ALL SIDEBAR VERIFICATIONS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
