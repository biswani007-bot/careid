const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle0' });

  const rules = await page.evaluate(() => {
    const input = document.querySelector('header input');
    if (!input) return null;
    const computed = window.getComputedStyle(input);
    const result = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && input.matches(rule.selectorText)) {
            result.push({
              selector: rule.selectorText,
              cssText: rule.cssText,
              href: sheet.href,
            });
          }
        }
      } catch (e) {}
    }
    return {
      classes: input.className,
      paddingLeft: computed.paddingLeft,
      rules: result,
    };
  });

  console.log(JSON.stringify(rules, null, 2));
  await browser.close();
}

run();
