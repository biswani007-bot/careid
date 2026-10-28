const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle0' });

  const btn = await page.$('.sidebar-cta-btn');
  const btnText = await page.evaluate(el => el ? el.innerText.trim() : null, btn);
  const svgCount = await page.evaluate(el => el ? el.querySelectorAll('svg').length : 0, btn);
  console.log('Button text content:', JSON.stringify(btnText));
  console.log('SVG icon count inside button:', svgCount);

  if (btn) {
    await btn.screenshot({ path: `${ARTIFACTS_DIR}\\cta_btn_verified.png` });
  }
  await page.screenshot({ path: `${ARTIFACTS_DIR}\\sidebar_cta_verified.png` });
  await browser.close();
  console.log('Verification screenshot saved successfully.');
})();
