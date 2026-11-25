const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function checkCssRules() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // Open modal
  await page.click('tbody tr:first-child');
  await new Promise((r) => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.innerText.includes('Full Details'));
    if (!btn) return 'Button not found';

    const computed = window.getComputedStyle(btn);
    const matchedRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule.selectorText && btn.matches(rule.selectorText)) {
            matchedRules.push({
              selector: rule.selectorText,
              cssText: rule.cssText,
            });
          }
        }
      } catch (e) {}
    }

    return {
      classes: btn.className,
      computedColor: computed.color,
      computedBgColor: computed.backgroundColor,
      matchedRules,
    };
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  await browser.close();
}

checkCssRules().catch(console.error);
