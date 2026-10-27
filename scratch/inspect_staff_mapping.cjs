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
  await page.setViewport({ width: 1440, height: 1024 });

  await page.goto('http://localhost:5173/admin/facilities/fac-1/staff-mapping', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const shotPath = path.join(ARTIFACT_DIR, 'current_staff_mapping_header.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved screenshot to:', shotPath);

  // Inspect the header styling and layout
  const headerInfo = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return null;
    const rect = header.getBoundingClientRect();
    const computed = window.getComputedStyle(header);
    const children = Array.from(header.children).map((c) => ({
      tagName: c.tagName,
      className: c.className,
      rect: c.getBoundingClientRect(),
      display: window.getComputedStyle(c).display,
      flexDirection: window.getComputedStyle(c).flexDirection,
    }));
    return {
      rect,
      display: computed.display,
      height: computed.height,
      flexDirection: computed.flexDirection,
      children,
    };
  });

  console.log('Header Info:', JSON.stringify(headerInfo, null, 2));

  await browser.close();
}

run();
