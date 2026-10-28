const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const mediaDir = path.join(
  'C:',
  'Users',
  'biswa',
  '.gemini',
  'antigravity-ide',
  'brain',
  'e0785a94-53fe-4f28-b816-f2efe4edf49e',
  '.tempmediaStorage'
);

async function inspectLayout() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });

  await page.goto('http://localhost:5173/admin/referrals/REF-8839', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-patient-name', { timeout: 8000 });

  const metrics = await page.evaluate(() => {
    const sidebar = document.querySelector('.careid-sidebar');
    const main = document.querySelector('.referral-details-main');
    const wrapper = document.querySelector('.referral-details-wrapper');
    const canvas = document.querySelector('.referral-details-canvas');
    const topbar = document.querySelector('.referral-details-topbar');

    const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
    const mRect = main ? main.getBoundingClientRect() : null;
    const cRect = canvas ? canvas.getBoundingClientRect() : null;
    const tRect = topbar ? topbar.getBoundingClientRect() : null;

    const sStyle = sidebar ? window.getComputedStyle(sidebar) : null;
    const mStyle = main ? window.getComputedStyle(main) : null;

    return {
      windowWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      sidebar: {
        width: sRect?.width,
        left: sRect?.left,
        right: sRect?.right,
        position: sStyle?.position,
      },
      main: {
        width: mRect?.width,
        left: mRect?.left,
        right: mRect?.right,
        marginLeft: mStyle?.marginLeft,
        boxSizing: mStyle?.boxSizing,
      },
      topbar: {
        width: tRect?.width,
        left: tRect?.left,
      },
      canvas: {
        width: cRect?.width,
        left: cRect?.left,
      },
      gapBetweenSidebarAndMain: mRect && sRect ? mRect.left - sRect.right : null,
    };
  });

  console.log('Layout Metrics at 1280x1024:', JSON.stringify(metrics, null, 2));

  const shot = path.join(mediaDir, 'debug_referral_details_1280.png');
  await page.screenshot({ path: shot });
  console.log('Saved screenshot to:', shot);

  await browser.close();
}

inspectLayout().catch(console.error);
