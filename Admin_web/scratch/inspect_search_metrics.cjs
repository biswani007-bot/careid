const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Inspect Facility Directory header search
  await page.goto('http://localhost:5173/admin/facilities', { waitUntil: 'networkidle0' });
  const dirHeader = await page.evaluate(() => {
    const input = document.querySelector('header input');
    const icon = document.querySelector('header svg.lucide-search') || document.querySelector('header .lucide-search');
    const wrapper = input ? input.parentElement : null;
    return {
      inputStyle: input ? {
        paddingLeft: window.getComputedStyle(input).paddingLeft,
        paddingRight: window.getComputedStyle(input).paddingRight,
        height: window.getComputedStyle(input).height,
        boxSizing: window.getComputedStyle(input).boxSizing,
        rect: input.getBoundingClientRect(),
      } : null,
      iconStyle: icon ? {
        rect: icon.getBoundingClientRect(),
        left: window.getComputedStyle(icon).left,
        position: window.getComputedStyle(icon).position,
      } : null,
      wrapperStyle: wrapper ? {
        rect: wrapper.getBoundingClientRect(),
        display: window.getComputedStyle(wrapper).display,
        flex: window.getComputedStyle(wrapper).flex,
        maxWidth: window.getComputedStyle(wrapper).maxWidth,
      } : null,
    };
  });
  console.log('Facility Directory Search Metrics:', JSON.stringify(dirHeader, null, 2));

  // 2. Inspect Facility Details header search
  await page.goto('http://localhost:5173/admin/facilities/fac-1', { waitUntil: 'networkidle0' });
  const detHeader = await page.evaluate(() => {
    const input = document.querySelector('header input');
    const icon = document.querySelector('header svg.lucide-search') || document.querySelector('header .lucide-search');
    const wrapper = input ? input.parentElement : null;
    const header = document.querySelector('header');
    return {
      headerChildren: header ? Array.from(header.children).map((c) => ({
        className: c.className,
        rect: c.getBoundingClientRect(),
      })) : null,
      inputStyle: input ? {
        paddingLeft: window.getComputedStyle(input).paddingLeft,
        height: window.getComputedStyle(input).height,
        rect: input.getBoundingClientRect(),
      } : null,
      iconStyle: icon ? {
        rect: icon.getBoundingClientRect(),
      } : null,
      wrapperStyle: wrapper ? {
        className: wrapper.className,
        rect: wrapper.getBoundingClientRect(),
      } : null,
    };
  });
  console.log('Facility Details Search Metrics:', JSON.stringify(detHeader, null, 2));

  await browser.close();
}

run();
