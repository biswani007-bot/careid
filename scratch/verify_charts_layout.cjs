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

async function runChartsVerification() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  const tests = [
    { name: '1920x1080', width: 1920, height: 1080, zoom: 1.0 },
    { name: '1366x768_zoom100', width: 1366, height: 768, zoom: 1.0 },
    { name: '1366x768_zoom125', width: 1093, height: 614, zoom: 1.25 },
    { name: '1024x768', width: 1024, height: 768, zoom: 1.0 },
    { name: '390x844', width: 390, height: 844, zoom: 1.0 }
  ];

  for (const t of tests) {
    await page.setViewport({ width: t.width, height: t.height, deviceScaleFactor: t.zoom });
    await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle0' });

    // Scroll down to the analytics charts section
    await page.evaluate(() => {
      const el = document.getElementById('analytics-section');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });

    await new Promise(r => setTimeout(r, 400));

    const chartDiag = await page.evaluate(() => {
      const barContainer = document.querySelector('.monitoring-bar-chart-container');
      const barLabels = document.querySelector('.monitoring-bar-labels');
      const donutContainer = document.querySelector('.monitoring-donut-container');
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;

      return {
        hasOverflow: docScrollWidth > winInnerWidth,
        barWidth: barContainer ? barContainer.clientWidth : 0,
        labelsWidth: barLabels ? barLabels.clientWidth : 0,
        donutWidth: donutContainer ? donutContainer.clientWidth : 0,
        donutScrollWidth: donutContainer ? donutContainer.scrollWidth : 0
      };
    });

    console.log(`[Charts - ${t.name}] overflow: ${chartDiag.hasOverflow}, barWidth: ${chartDiag.barWidth}, labelsWidth: ${chartDiag.labelsWidth}, donutWidth: ${chartDiag.donutWidth}, donutScroll: ${chartDiag.donutScrollWidth}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, `charts_${t.name}.png`) });
  }

  await browser.close();
  console.log('Charts verification complete.');
}

runChartsVerification().catch(console.error);

