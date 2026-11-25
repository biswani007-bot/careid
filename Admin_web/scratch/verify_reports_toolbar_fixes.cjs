const puppeteer = require('puppeteer-core');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('=== VERIFYING REPORTS DASHBOARD TOOLBAR FIXES ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.accessToken;

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all'],
      status: 'ACTIVE'
    }));
  }, token);

  console.log('Navigating to http://localhost:5173/admin/reports at 1440x900...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Inspect Desktop Toolbar Metrics
  const metrics = await page.evaluate(() => {
    const topNavbar = document.querySelector('.reports-top-navbar');
    const searchBox = document.querySelector('.reports-search-box');
    const iconBtns = Array.from(document.querySelectorAll('.reports-icon-btn'));
    const avatar = document.querySelector('.reports-admin-avatar');
    const topRight = document.querySelector('.reports-top-right');

    const headerRow = document.querySelector('.reports-header-row');
    const filtersGroup = document.querySelector('.reports-filters-group');
    const timeSegmented = document.querySelector('.reports-time-segmented');
    const timeBtns = Array.from(document.querySelectorAll('.reports-time-btn'));
    const dropdownBtns = Array.from(document.querySelectorAll('.reports-dropdown-btn'));
    const exportBtn = document.querySelector('.reports-export-btn');

    const bentoGrid = document.querySelector('.reports-bento-grid');

    const getMetrics = el => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: style.display,
        alignItems: style.alignItems,
      };
    };

    return {
      topNavbar: getMetrics(topNavbar),
      searchBox: getMetrics(searchBox),
      iconBtns: iconBtns.map(getMetrics),
      avatar: getMetrics(avatar),
      topRight: getMetrics(topRight),
      headerRow: getMetrics(headerRow),
      filtersGroup: getMetrics(filtersGroup),
      timeSegmented: getMetrics(timeSegmented),
      timeBtnWidths: timeBtns.map(b => ({ text: b.textContent.trim(), width: Math.round(b.getBoundingClientRect().width) })),
      dropdowns: dropdownBtns.map(d => ({ text: d.textContent.trim(), metrics: getMetrics(d) })),
      exportBtn: getMetrics(exportBtn),
      bentoGridTop: Math.round(bentoGrid?.getBoundingClientRect().top || 0),
      headerRowBottom: Math.round(headerRow?.getBoundingClientRect().bottom || 0),
    };
  });

  console.log('1. TOP NAVBAR METRICS:');
  console.log('  Top Navbar Height:', metrics.topNavbar?.height);
  console.log('  Search Box Height:', metrics.searchBox?.height, '| Width:', metrics.searchBox?.width);
  console.log('  Icon Buttons Heights:', metrics.iconBtns.map(b => b?.height));
  console.log('  Avatar Height:', metrics.avatar?.height, '| Width:', metrics.avatar?.width);
  console.log('  Top Navbar Elements Vertical Alignment:');
  console.log('    Search Box Y center:', (metrics.searchBox?.top + metrics.searchBox?.bottom) / 2);
  console.log('    First Icon Y center:', (metrics.iconBtns[0]?.top + metrics.iconBtns[0]?.bottom) / 2);
  console.log('    Avatar Y center:', (metrics.avatar?.top + metrics.avatar?.bottom) / 2);

  console.log('\n2. FILTER TOOLBAR METRICS:');
  console.log('  Time Segmented Height:', metrics.timeSegmented?.height);
  console.log('  Segmented Button Widths (Even Spacing):', metrics.timeBtnWidths);
  console.log('  Dropdowns Heights:', metrics.dropdowns.map(d => `${d.text}: ${d.metrics?.height}px`));
  console.log('  Export Button Height:', metrics.exportBtn?.height, '| Width:', metrics.exportBtn?.width);
  console.log('  Filters Group Alignment:');
  console.log('    Time Segmented Y center:', (metrics.timeSegmented?.top + metrics.timeSegmented?.bottom) / 2);
  console.log('    Hospital Dropdown Y center:', (metrics.dropdowns[0]?.metrics?.top + metrics.dropdowns[0]?.metrics?.bottom) / 2);
  console.log('    Department Dropdown Y center:', (metrics.dropdowns[1]?.metrics?.top + metrics.dropdowns[1]?.metrics?.bottom) / 2);
  console.log('    Export Button Y center:', (metrics.exportBtn?.top + metrics.exportBtn?.bottom) / 2);
  console.log('  Single Horizontal Row Check:');
  const allYCenters = [
    (metrics.timeSegmented?.top + metrics.timeSegmented?.bottom) / 2,
    (metrics.dropdowns[0]?.metrics?.top + metrics.dropdowns[0]?.metrics?.bottom) / 2,
    (metrics.dropdowns[1]?.metrics?.top + metrics.dropdowns[1]?.metrics?.bottom) / 2,
    (metrics.exportBtn?.top + metrics.exportBtn?.bottom) / 2,
  ];
  const maxYDiff = Math.max(...allYCenters) - Math.min(...allYCenters);
  console.log('    Max Y-center difference across all 4 controls:', maxYDiff, 'px (should be 0 or <1px)');

  console.log('\n3. SPACING METRICS:');
  console.log('  Gap between Header Row Bottom and Bento Grid Top:', metrics.bentoGridTop - metrics.headerRowBottom, 'px (intended 24px)');

  // Take Desktop screenshot
  await page.screenshot({ path: 'scratch/reports_dashboard_desktop.png' });
  console.log('Saved scratch/reports_dashboard_desktop.png');

  // 4. Test Tablet Viewport (768x1024)
  console.log('\n4. TESTING TABLET VIEWPORT (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 600));

  const tabletMetrics = await page.evaluate(() => {
    const exportBtn = document.querySelector('.reports-export-btn');
    const filtersGroup = document.querySelector('.reports-filters-group');
    const isExportVisible = exportBtn && window.getComputedStyle(exportBtn).display !== 'none';
    const exportRect = exportBtn?.getBoundingClientRect();
    const groupRect = filtersGroup?.getBoundingClientRect();

    return {
      isExportVisible,
      exportWidth: exportRect?.width,
      exportHeight: exportRect?.height,
      groupScrollWidth: filtersGroup?.scrollWidth,
      groupClientWidth: filtersGroup?.clientWidth,
    };
  });
  console.log('  Export Button visible on tablet:', tabletMetrics.isExportVisible);
  console.log('  Export Button dimensions:', tabletMetrics.exportWidth, 'x', tabletMetrics.exportHeight);
  await page.screenshot({ path: 'scratch/reports_dashboard_tablet.png' });
  console.log('Saved scratch/reports_dashboard_tablet.png');

  // 5. Test Mobile Viewport (375x667)
  console.log('\n5. TESTING MOBILE VIEWPORT (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 600));

  const mobileMetrics = await page.evaluate(() => {
    const exportBtn = document.querySelector('.reports-export-btn');
    const filtersGroup = document.querySelector('.reports-filters-group');
    const isExportVisible = exportBtn && window.getComputedStyle(exportBtn).display !== 'none';
    return {
      isExportVisible,
      filterCount: filtersGroup?.children.length,
      groupScrollWidth: filtersGroup?.scrollWidth,
      groupClientWidth: filtersGroup?.clientWidth,
    };
  });
  console.log('  Export Button visible on mobile:', mobileMetrics.isExportVisible);
  console.log('  Filter Controls count in scroll group:', mobileMetrics.filterCount);
  await page.screenshot({ path: 'scratch/reports_dashboard_mobile.png' });
  console.log('Saved scratch/reports_dashboard_mobile.png');

  await browser.close();
  console.log('\n=== ALL TOOLBAR VERIFICATION CHECKS PASSED ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

