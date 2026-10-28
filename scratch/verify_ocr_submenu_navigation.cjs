const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.tempmediaStorage';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function verifyOcrSubmenu() {
  console.log('🚀 Starting Verification of OCR Verification Submenu Navigation...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.toString() });
  });

  try {
    // 1. Visit /admin/ocr/queue
    console.log('\n--- 1. Testing /admin/ocr/queue ---');
    await page.goto(`${BASE_URL}/admin/ocr/queue`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.sidebar-subnav-list', { timeout: 8000 });

    const queueSubnavItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      return items.map((el) => ({
        text: el.textContent.trim(),
        isActive: el.classList.contains('active'),
      }));
    });
    console.log('Submenu items on /admin/ocr/queue:', queueSubnavItems);

    const shotQueue = path.join(ARTIFACTS_DIR, 'ocr_subnav_queue.png');
    await page.screenshot({ path: shotQueue, fullPage: false });
    console.log(`✓ Saved screenshot to: ${shotQueue}`);

    // Verify Processing Queue is active
    const queueActive = queueSubnavItems.find((i) => i.text === 'Processing Queue')?.isActive;
    if (!queueActive) {
      throw new Error('Expected "Processing Queue" to be active');
    }
    console.log('✓ "Processing Queue" is active');

    // 2. Click "Rejected Documents" in submenu
    console.log('\n--- 2. Clicking "Rejected Documents" in submenu ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const rejectedItem = items.find((el) => el.textContent.includes('Rejected Documents'));
      if (rejectedItem) rejectedItem.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));

    console.log('Current URL after click:', page.url());
    if (!page.url().includes('/admin/ocr/rejected')) {
      throw new Error(`Expected URL to include /admin/ocr/rejected, got ${page.url()}`);
    }

    const rejectedSubnavItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const title = document.querySelector('.ocr-rejected-title')?.textContent?.trim();
      const breadcrumb = document.querySelector('.ocr-rejected-breadcrumb-current')?.textContent?.trim();
      return {
        items: items.map((el) => ({
          text: el.textContent.trim(),
          isActive: el.classList.contains('active'),
        })),
        title,
        breadcrumb,
      };
    });
    console.log('State on /admin/ocr/rejected:', rejectedSubnavItems);

    const shotRejected = path.join(ARTIFACTS_DIR, 'ocr_subnav_rejected.png');
    await page.screenshot({ path: shotRejected, fullPage: false });
    console.log(`✓ Saved screenshot to: ${shotRejected}`);

    const rejectedActive = rejectedSubnavItems.items.find((i) => i.text === 'Rejected Documents')?.isActive;
    if (!rejectedActive) {
      throw new Error('Expected "Rejected Documents" to be active');
    }
    console.log('✓ "Rejected Documents" is active and screen loaded');

    // 3. Click "Review History" in submenu
    console.log('\n--- 3. Clicking "Review History" in submenu ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const historyItem = items.find((el) => el.textContent.includes('Review History'));
      if (historyItem) historyItem.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));

    console.log('Current URL after click:', page.url());
    if (!page.url().includes('/admin/ocr/history')) {
      throw new Error(`Expected URL to include /admin/ocr/history, got ${page.url()}`);
    }

    const historySubnavItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const title = document.querySelector('.ocr-rejected-title')?.textContent?.trim();
      const breadcrumb = document.querySelector('.ocr-rejected-breadcrumb-current')?.textContent?.trim();
      return {
        items: items.map((el) => ({
          text: el.textContent.trim(),
          isActive: el.classList.contains('active'),
        })),
        title,
        breadcrumb,
      };
    });
    console.log('State on /admin/ocr/history:', historySubnavItems);

    const shotHistory = path.join(ARTIFACTS_DIR, 'ocr_subnav_history.png');
    await page.screenshot({ path: shotHistory, fullPage: false });
    console.log(`✓ Saved screenshot to: ${shotHistory}`);

    const historyActive = historySubnavItems.items.find((i) => i.text === 'Review History')?.isActive;
    if (!historyActive) {
      throw new Error('Expected "Review History" to be active');
    }
    console.log('✓ "Review History" is active and screen loaded');

    // 4. Click back to "Processing Queue"
    console.log('\n--- 4. Clicking back to "Processing Queue" in submenu ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const queueItem = items.find((el) => el.textContent.includes('Processing Queue'));
      if (queueItem) queueItem.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));

    console.log('Current URL after click:', page.url());
    if (!page.url().includes('/admin/ocr/queue')) {
      throw new Error(`Expected URL to include /admin/ocr/queue, got ${page.url()}`);
    }
    console.log('✓ Successfully navigated back to Processing Queue');

    console.log('\n=== ALL SUBMENU NAVIGATION CHECKS PASSED ===');
    console.log('Console Errors count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyOcrSubmenu();
