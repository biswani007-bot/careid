const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = path.join(
  process.env.USERPROFILE || 'C:\\Users\\biswa',
  '.gemini',
  'antigravity',
  'brain',
  'e0785a94-53fe-4f28-b816-f2efe4edf49e',
  '.tempmediaStorage'
);

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runDiagnostics() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1600, height: 900, name: '1600x900' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1280, height: 1024, name: '1280x1024' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 390, height: 844, name: '390x844' }
  ];

  const zoomLevels = [0.8, 0.9, 1.0, 1.1, 1.25];

  console.log('--- STARTING VIEWPORT TESTS AT NORMAL (100%) ZOOM ---');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

    const diag = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const hasPageHorizontalOverflow = docScrollWidth > winInnerWidth;

      const sidebar = document.querySelector('.careid-sidebar');
      const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const sidebarVisible = sidebarRect ? sidebarRect.width > 0 && sidebarRect.right > 0 : false;

      const navbar = document.querySelector('.monitoring-top-navbar');
      const navRect = navbar ? navbar.getBoundingClientRect() : null;
      const navOverflow = navRect ? navRect.width > winInnerWidth : false;

      const metricCards = Array.from(document.querySelectorAll('.monitoring-metric-card')).map(card => {
        const r = card.getBoundingClientRect();
        return {
          width: Math.round(r.width),
          height: Math.round(r.height),
          scrollWidth: card.scrollWidth,
          scrollHeight: card.scrollHeight,
          isOverflowing: card.scrollWidth > r.width + 1 || card.scrollHeight > r.height + 1
        };
      });

      const tableWrapper = document.querySelector('.monitoring-table-wrapper');
      const tableWrapperRect = tableWrapper ? tableWrapper.getBoundingClientRect() : null;
      const table = document.querySelector('.monitoring-table');
      const tableRect = table ? table.getBoundingClientRect() : null;

      const barChart = document.querySelector('.monitoring-bar-chart-container');
      const barChartRect = barChart ? barChart.getBoundingClientRect() : null;
      const barLabels = document.querySelector('.monitoring-bar-labels');
      const barLabelsRect = barLabels ? barLabels.getBoundingClientRect() : null;

      const donutContainer = document.querySelector('.monitoring-donut-container');
      const donutRect = donutContainer ? donutContainer.getBoundingClientRect() : null;
      const donutOverflow = donutContainer ? donutContainer.scrollWidth > donutContainer.clientWidth : false;

      return {
        docScrollWidth,
        winInnerWidth,
        hasPageHorizontalOverflow,
        sidebarVisible,
        sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : 0,
        navOverflow,
        metricCards,
        tableWrapperWidth: tableWrapperRect ? Math.round(tableWrapperRect.width) : 0,
        tableWidth: tableRect ? Math.round(tableRect.width) : 0,
        barChartWidth: barChartRect ? Math.round(barChartRect.width) : 0,
        barLabelsWidth: barLabelsRect ? Math.round(barLabelsRect.width) : 0,
        donutOverflow,
        donutWidth: donutRect ? Math.round(donutRect.width) : 0
      };
    });

    console.log(`[${vp.name}] pageOverflow: ${diag.hasPageHorizontalOverflow}, sidebar: ${diag.sidebarVisible} (${diag.sidebarWidth}px), metricCards: ${JSON.stringify(diag.metricCards)}, donutOverflow: ${diag.donutOverflow}`);

    const screenshotPath = path.join(ARTIFACT_DIR, `diag_${vp.name}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  console.log('\n--- STARTING ZOOM LEVEL TESTS (AT 1366x768 BASE VIEWPORT) ---');
  for (const zoom of zoomLevels) {
    // Browser zoom changes the effective CSS viewport dimensions:
    // e.g. at 125% zoom on a 1366x768 screen, the CSS viewport is 1366 / 1.25 = 1092.8 x 768 / 1.25 = 614.4
    // Alternatively, Puppeteer can emulate zoom via evaluate document.body.style.zoom or deviceScaleFactor / page.setViewport
    // Real browser zoom scales the CSS viewport: CSS width = Physical width / Zoom
    const effectiveWidth = Math.round(1366 / zoom);
    const effectiveHeight = Math.round(768 / zoom);

    await page.setViewport({ width: effectiveWidth, height: effectiveHeight, deviceScaleFactor: zoom });
    await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

    const diag = await page.evaluate((z) => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const hasPageHorizontalOverflow = docScrollWidth > winInnerWidth;

      const metricCards = Array.from(document.querySelectorAll('.monitoring-metric-card')).map(card => {
        const r = card.getBoundingClientRect();
        return {
          width: Math.round(r.width),
          height: Math.round(r.height),
          scrollWidth: card.scrollWidth,
          scrollHeight: card.scrollHeight,
          isOverflowing: card.scrollHeight > r.height + 1
        };
      });

      const donutContainer = document.querySelector('.monitoring-donut-container');
      const donutOverflow = donutContainer ? donutContainer.scrollWidth > donutContainer.clientWidth : false;

      return {
        zoom: z,
        docScrollWidth,
        winInnerWidth,
        hasPageHorizontalOverflow,
        metricCards,
        donutOverflow
      };
    }, zoom);

    console.log(`[Zoom ${(zoom * 100).toFixed(0)}% (eff: ${effectiveWidth}x${effectiveHeight})] pageOverflow: ${diag.hasPageHorizontalOverflow}, metricOverflow: ${diag.metricCards.some(m => m.isOverflowing)}, donutOverflow: ${diag.donutOverflow}`);

    const zoomScreenshotPath = path.join(ARTIFACT_DIR, `diag_zoom_${(zoom * 100).toFixed(0)}.png`);
    await page.screenshot({ path: zoomScreenshotPath });
  }

  await browser.close();
  console.log('\nDiagnostics complete. Screenshots saved.');
}

runDiagnostics().catch(console.error);
