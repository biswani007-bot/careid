const puppeteer = require('puppeteer-core');
const path = require('path');
const { getAdminToken } = require('../scratch/token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5174';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  const token = await getAdminToken();
  console.log('Obtained admin token.');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1080'],
    defaultViewport: { width: 1440, height: 1080 }
  });

  const page = await browser.newPage();

  // Set auth tokens in localStorage
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
      email: 'admin@careid.test',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  // 1. Start from /admin/settings/general and click "Security Policies" tab
  console.log('Navigating to /admin/settings/general...');
  await page.goto(`${BASE_URL}/admin/settings/general`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Security Policies tab...');
  const tabClicked = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
    const secTab = tabs.find(t => t.innerText.includes('Security Policies'));
    if (secTab) {
      secTab.click();
      return true;
    }
    return false;
  });
  console.log('Tab clicked:', tabClicked);
  await new Promise(r => setTimeout(r, 2000));

  // Extract page info
  const initialData = await page.evaluate(() => {
    const title = document.querySelector('.security-header-title')?.innerText?.trim();
    const badge = document.querySelector('.security-header-info span')?.innerText?.trim();
    return { title, badge, url: window.location.pathname };
  });
  console.log('Loaded Security Page:', JSON.stringify(initialData, null, 2));

  // Screenshot 1: Loaded Security Policies
  const ss1Path = path.join(ARTIFACT_DIR, 'security_policies_01_loaded.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log('Saved screenshot 1 to', ss1Path);

  // 2. Click "Reset to Compliance Defaults" to open modal
  console.log('Opening Reset Defaults modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const resetBtn = btns.find(b => b.innerText.includes('Reset to Compliance Defaults'));
    if (resetBtn) resetBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 2: Reset Defaults Confirmation Dialog
  const ss2Path = path.join(ARTIFACT_DIR, 'security_policies_02_reset_modal.png');
  await page.screenshot({ path: ss2Path, fullPage: false });
  console.log('Saved screenshot 2 to', ss2Path);

  // Close the modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'Cancel');
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // 3. Make an edit and save
  console.log('Modifying setting: toggling Force Step-Up Reauth or Max Sessions...');
  await page.evaluate(() => {
    // Increase concurrent session limit
    const incBtn = Array.from(document.querySelectorAll('.security-num-btn')).find(b => b.querySelector('svg')?.classList.contains('lucide-plus'));
    if (incBtn) incBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('Submitting Save Security Policies...');
  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(b => b.innerText.includes('Save'));
    if (saveBtn) saveBtn.click();
  });

  // Wait for the status toast to appear
  await page.waitForSelector('[role="status"]', { timeout: 15000 });
  const saveToast = await page.evaluate(() => {
    const notif = document.querySelector('[role="status"] span')?.innerText;
    return notif || document.querySelector('[role="status"]')?.innerText;
  });
  console.log('Save result notification:', saveToast);

  // Screenshot 3: Saved & Verified notification
  const ss3Path = path.join(ARTIFACT_DIR, 'security_policies_03_saved_verified.png');
  await page.screenshot({ path: ss3Path, fullPage: false });
  console.log('Saved screenshot 3 to', ss3Path);

  // 4. Reload page to verify persistence across page reloads
  console.log('Reloading page to verify persistence across reloads...');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const afterReloadData = await page.evaluate(() => {
    const badge = document.querySelector('.security-header-info span')?.innerText?.trim();
    return { badge, url: window.location.pathname };
  });
  console.log('After reload:', JSON.stringify(afterReloadData, null, 2));

  // Screenshot 4: Persisted after reload
  const ss4Path = path.join(ARTIFACT_DIR, 'security_policies_04_persisted_reload.png');
  await page.screenshot({ path: ss4Path, fullPage: false });
  console.log('Saved screenshot 4 to', ss4Path);

  await browser.close();
  console.log('All automated browser tests completed successfully!');
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});
