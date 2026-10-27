const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle0' });

  // Click kebab on row 5 (last row)
  const kebabButtons = await page.$$('.user-action-btn');
  console.log('Found action buttons count:', kebabButtons.length);
  if (kebabButtons.length > 0) {
    const lastBtn = kebabButtons[kebabButtons.length - 1];
    await lastBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(ARTIFACT_DIR, 'current_dropdown_last_row.png');
    await page.screenshot({ path: ssPath });
    console.log('Saved screenshot of current dropdown on last row:', ssPath);
  }

  await browser.close();
}

run();
