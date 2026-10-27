const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

async function inspectModalAndButtons() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to /admin/records...');
  await page.goto(`${BASE_URL}/admin/records`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_admin_records_list.png') });

  // Click row to open modal
  console.log('Clicking first row to open modal...');
  await page.click('tbody tr:first-child');
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_admin_records_modal.png') });

  // Inspect the modal and buttons
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('.records-modal-card');
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => {
      const rect = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return {
        text: b.innerText.trim(),
        className: b.className,
        color: style.color,
        backgroundColor: style.backgroundColor,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        disabled: b.disabled,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
    });
    return { modalPresent: !!modal, buttons };
  });

  console.log('Modal Info:', JSON.stringify(modalInfo, null, 2));

  // Now click "View Full Details & Audit Trail"
  console.log('Clicking "View Full Details & Audit Trail"...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find((b) => b.innerText.includes('Full Details') || b.innerText.includes('Audit Trail'));
    if (target) {
      target.click();
      return true;
    }
    return false;
  });
  console.log('Clicked target button:', clicked);
  await new Promise((r) => setTimeout(r, 1200));

  console.log('URL after click:', page.url());
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_after_click_full_details.png') });

  // Inspect buttons on destination page
  const pageDetailsInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map((b) => {
      const rect = b.getBoundingClientRect();
      const style = window.getComputedStyle(b);
      return {
        text: b.innerText.trim(),
        className: b.className,
        color: style.color,
        backgroundColor: style.backgroundColor,
        opacity: style.opacity,
        disabled: b.disabled,
      };
    });
    return { url: window.location.href, buttons };
  });
  console.log('Page Details Buttons:', JSON.stringify(pageDetailsInfo, null, 2));

  await browser.close();
}

inspectModalAndButtons().catch((e) => console.error(e));
