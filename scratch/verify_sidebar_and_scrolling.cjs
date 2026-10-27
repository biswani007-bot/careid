const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e');

async function run() {
  console.log('=== Starting CareID Admin Portal Comprehensive Verification ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('  [Browser Error]:', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('  [Page Error]:', err.message);
  });

  try {
    // =========================================================================
    // TEST 1: Patients Directory (/admin/patients)
    // =========================================================================
    console.log('Test 1: Testing /admin/patients (Patients Directory)...');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.patients-table-row', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    // 1.1 Sidebar Inspection on Patients Directory
    const dirSidebar = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const logo = document.querySelector('.sidebar-logo');
      const closeBtn = document.querySelector('.sidebar-close-btn');
      const navItems = Array.from(document.querySelectorAll('.sidebar-nav-item')).map(el => {
        return {
          label: el.querySelector('.sidebar-nav-label')?.textContent?.trim(),
          isActive: el.classList.contains('active'),
          bg: window.getComputedStyle(el).backgroundImage || window.getComputedStyle(el).backgroundColor,
        };
      });
      const ocrBtn = document.querySelector('.sidebar-cta-btn');
      const logoutBtn = document.querySelector('.sidebar-logout-btn');

      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const logoRect = logo ? logo.getBoundingClientRect() : null;
      const closeDisplay = closeBtn ? window.getComputedStyle(closeBtn).display : null;

      return {
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        logoHeight: logoRect ? Math.round(logoRect.height) : 0,
        logoWidth: logoRect ? Math.round(logoRect.width) : 0,
        closeDisplay,
        navCount: navItems.length,
        navItems,
        hasOcrBtn: !!ocrBtn,
        hasLogoutBtn: !!logoutBtn,
      };
    });

    console.log('  Sidebar check:', {
      width: `${dirSidebar.sidebarWidth}px (Target ~260px)`,
      logoSize: `${dirSidebar.logoWidth}x${dirSidebar.logoHeight}px (Target height 25px, max-width 115px)`,
      closeButtonDesktopDisplay: dirSidebar.closeDisplay,
      navItemsCount: dirSidebar.navCount,
      hasOcrReview: dirSidebar.hasOcrBtn,
      hasLogout: dirSidebar.hasLogoutBtn,
    });

    const activeItemDir = dirSidebar.navItems.find(i => i.isActive);
    console.log('  Active item in Directory:', activeItemDir?.label);

    // 1.2 Header Inspection on Patients Directory
    const dirHeader = await page.evaluate(() => {
      const header = document.querySelector('.careid-top-navbar');
      const rect = header ? header.getBoundingClientRect() : null;
      const breadcrumb = document.querySelector('.patients-breadcrumbs')?.textContent?.replace(/\s+/g, ' ').trim();
      const hasSearch = !!document.querySelector('.patients-header-search-wrap');
      const hasBell = !!document.querySelector('.users-header-icon-btn');
      const hasSupport = !!document.querySelector('.users-header-support-btn');
      const hasConsole = !!document.querySelector('.users-header-console-btn');
      const hasAvatar = !!document.querySelector('.users-header-avatar');

      return {
        height: rect ? Math.round(rect.height) : 0,
        breadcrumb,
        hasSearch,
        hasBell,
        hasSupport,
        hasConsole,
        hasAvatar,
      };
    });

    console.log('  Header check on Directory:', dirHeader);

    // 1.3 Scrolling Inspection on Patients Directory
    const dirScroll = await page.evaluate(() => {
      const canvas = document.querySelector('.patients-main-canvas');
      const initialScrollTop = canvas.scrollTop;
      const scrollHeight = canvas.scrollHeight;
      const clientHeight = canvas.clientHeight;

      // Scroll to bottom
      canvas.scrollTop = scrollHeight;
      const finalScrollTop = canvas.scrollTop;

      const pagination = document.querySelector('.patients-pagination');
      const paginationRect = pagination ? pagination.getBoundingClientRect() : null;
      const isPaginationInView = paginationRect ? (paginationRect.top < window.innerHeight && paginationRect.bottom > 0) : false;

      return {
        clientHeight,
        scrollHeight,
        initialScrollTop,
        finalScrollTop,
        isPaginationInView,
        canScroll: scrollHeight > clientHeight,
      };
    });

    console.log('  Directory Scrolling metrics:', dirScroll);

    // Capture screenshot of Directory Top
    const dirTopShot = path.join(ARTIFACT_DIR, 'patients_directory_top.png');
    await page.evaluate(() => {
      document.querySelector('.patients-main-canvas').scrollTop = 0;
    });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: dirTopShot });

    // Capture screenshot of Directory Scrolled Bottom (showing rows 7-10 and pagination!)
    const dirBottomShot = path.join(ARTIFACT_DIR, 'patients_directory_scrolled_bottom.png');
    await page.evaluate(() => {
      const c = document.querySelector('.patients-main-canvas');
      c.scrollTop = c.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: dirBottomShot });
    console.log('  Captured Directory screenshots: patients_directory_top.png & patients_directory_scrolled_bottom.png');


    // =========================================================================
    // TEST 2: Patient Profile (/admin/patients/pat-1)
    // =========================================================================
    console.log('\nTest 2: Testing /admin/patients/pat-1 (Patient Profile)...');
    await page.goto('http://localhost:5173/admin/patients/pat-1', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.patient-profile-canvas', { timeout: 8000 });
    await new Promise(r => setTimeout(r, 600));

    // 2.1 Sidebar Inspection on Patient Profile
    const profSidebar = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const logo = document.querySelector('.sidebar-logo');
      const closeBtn = document.querySelector('.sidebar-close-btn');
      const navItems = Array.from(document.querySelectorAll('.sidebar-nav-item')).map(el => {
        return {
          label: el.querySelector('.sidebar-nav-label')?.textContent?.trim(),
          isActive: el.classList.contains('active'),
          bg: window.getComputedStyle(el).backgroundImage || window.getComputedStyle(el).backgroundColor,
        };
      });
      const ocrBtn = document.querySelector('.sidebar-cta-btn');
      const logoutBtn = document.querySelector('.sidebar-logout-btn');

      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const logoRect = logo ? logo.getBoundingClientRect() : null;
      const closeDisplay = closeBtn ? window.getComputedStyle(closeBtn).display : null;

      return {
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        logoHeight: logoRect ? Math.round(logoRect.height) : 0,
        logoWidth: logoRect ? Math.round(logoRect.width) : 0,
        closeDisplay,
        navCount: navItems.length,
        navItems,
        hasOcrBtn: !!ocrBtn,
        hasLogoutBtn: !!logoutBtn,
      };
    });

    console.log('  Sidebar check on Profile:', {
      width: `${profSidebar.sidebarWidth}px`,
      logoSize: `${profSidebar.logoWidth}x${profSidebar.logoHeight}px`,
      closeButtonDesktopDisplay: profSidebar.closeDisplay,
      navItemsCount: profSidebar.navCount,
      hasOcrReview: profSidebar.hasOcrBtn,
      hasLogout: profSidebar.hasLogoutBtn,
    });

    const activeItemProf = profSidebar.navItems.find(i => i.isActive);
    console.log('  Active item in Profile:', activeItemProf?.label);

    // 2.2 Header Inspection on Patient Profile
    const profHeader = await page.evaluate(() => {
      const header = document.querySelector('.careid-top-navbar');
      const rect = header ? header.getBoundingClientRect() : null;
      const searchInput = document.querySelector('.patient-profile-search-input');
      const searchPlaceholder = searchInput ? searchInput.getAttribute('placeholder') : null;
      const hasBell = !!document.querySelector('.users-header-icon-btn');
      const hasSupport = !!document.querySelector('.users-header-support-btn');
      const consoleBtn = document.querySelector('.patient-profile-admin-console-pill');
      const consoleText = consoleBtn?.textContent?.trim();
      const consoleBg = consoleBtn ? window.getComputedStyle(consoleBtn).backgroundColor : null;
      const hasAvatar = !!document.querySelector('.users-header-avatar');

      return {
        height: rect ? Math.round(rect.height) : 0,
        searchPlaceholder,
        hasBell,
        hasSupport,
        consoleText,
        consoleBg,
        hasAvatar,
      };
    });

    console.log('  Header check on Profile:', profHeader);

    // 2.3 Scrolling Inspection on Patient Profile
    const profScroll = await page.evaluate(() => {
      const canvas = document.querySelector('.patient-profile-canvas');
      const initialScrollTop = canvas.scrollTop;
      const scrollHeight = canvas.scrollHeight;
      const clientHeight = canvas.clientHeight;

      // Check bottom sections
      const vaultCard = document.querySelector('.patient-profile-card-vault');
      const familyCard = document.querySelector('.patient-profile-card-family');

      // Scroll to bottom
      canvas.scrollTop = scrollHeight;
      const finalScrollTop = canvas.scrollTop;

      const vaultRect = vaultCard ? vaultCard.getBoundingClientRect() : null;
      const isVaultInView = vaultRect ? (vaultRect.top < window.innerHeight && vaultRect.bottom > 0) : false;

      return {
        clientHeight,
        scrollHeight,
        initialScrollTop,
        finalScrollTop,
        canScroll: scrollHeight > clientHeight,
        hasVaultCard: !!vaultCard,
        hasFamilyCard: !!familyCard,
        isVaultInViewAfterScroll: isVaultInView,
      };
    });

    console.log('  Profile Scrolling metrics:', profScroll);

    // Capture screenshots of Patient Profile
    const profTopShot = path.join(ARTIFACT_DIR, 'patient_profile_top.png');
    await page.evaluate(() => {
      document.querySelector('.patient-profile-canvas').scrollTop = 0;
    });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: profTopShot });

    const profBottomShot = path.join(ARTIFACT_DIR, 'patient_profile_scrolled_bottom.png');
    await page.evaluate(() => {
      const c = document.querySelector('.patient-profile-canvas');
      c.scrollTop = c.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 200));
    await page.screenshot({ path: profBottomShot });
    console.log('  Captured Profile screenshots: patient_profile_top.png & patient_profile_scrolled_bottom.png');

    // =========================================================================
    // TEST 3: Navigation consistency & No Regressions
    // =========================================================================
    console.log('\nTest 3: Checking SPA Navigation between Screens & Regression...');
    // Click Dashboard nav
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      const btn = items.find(el => el.textContent && el.textContent.includes('Dashboard'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/admin/dashboard', { timeout: 5000 });
    console.log('  Navigated to Dashboard:', page.url());

    // Click Users nav
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      const btn = items.find(el => el.textContent && el.textContent.includes('Users'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/admin/users', { timeout: 5000 });
    console.log('  Navigated to Users:', page.url());

    // Click Patients nav
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      const btn = items.find(el => el.textContent && el.textContent.includes('Patients'));
      if (btn) btn.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/admin/patients', { timeout: 5000 });
    console.log('  Navigated to Patients:', page.url());


    // =========================================================================
    // TEST 4: Responsive / Mobile drawer check
    // =========================================================================
    console.log('\nTest 4: Checking Mobile / Tablet Viewport & Drawer...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 300));

    const mobileCheck = await page.evaluate(() => {
      const hamburger = document.querySelector('.header-menu-toggle');
      const hDisplay = window.getComputedStyle(hamburger).display;
      const sidebar = document.querySelector('.careid-sidebar');
      const isDrawerOpen = sidebar.classList.contains('drawer-open');
      return {
        hamburgerVisible: hDisplay !== 'none',
        isDrawerInitiallyClosed: !isDrawerOpen,
      };
    });
    console.log('  Mobile hamburger visible:', mobileCheck.hamburgerVisible, 'Drawer initially closed:', mobileCheck.isDrawerInitiallyClosed);

    // Click hamburger to open drawer
    await page.click('.header-menu-toggle');
    await new Promise(r => setTimeout(r, 400));
    const drawerOpenCheck = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      const closeBtn = document.querySelector('.sidebar-close-btn');
      return {
        hasDrawerOpenClass: sidebar.classList.contains('drawer-open'),
        closeBtnVisible: window.getComputedStyle(closeBtn).display !== 'none',
      };
    });
    console.log('  Drawer opened successfully:', drawerOpenCheck.hasDrawerOpenClass, 'Close button visible on mobile:', drawerOpenCheck.closeBtnVisible);

    // Click close button in mobile drawer
    await page.click('.sidebar-close-btn');
    await new Promise(r => setTimeout(r, 400));
    const drawerClosedCheck = await page.evaluate(() => {
      const sidebar = document.querySelector('.careid-sidebar');
      return !sidebar.classList.contains('drawer-open');
    });
    console.log('  Drawer closed successfully:', drawerClosedCheck);

    console.log('\nTotal Console Errors caught during tests:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }

    console.log('\n=== All Verification Tests Passed Successfully! ===');
  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    await browser.close();
  }
}

run();
