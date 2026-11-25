const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const cachedToken = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'domcontentloaded' });
  await page.evaluate((authData) => {
    localStorage.setItem('careid_access_token', authData.accessToken);
    localStorage.setItem('careid_refresh_token', authData.refreshToken);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: authData.user.id,
      phone: authData.user.phone,
      roles: authData.user.roles,
      status: authData.user.status,
      permissions: authData.user.permissions,
      name: 'Super Admin',
      email: 'admin@careid.test'
    }));
  }, cachedToken);

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Click user-action-btn
  const actionBtn = await page.$('.user-action-btn');
  if (actionBtn) {
    console.log('Found .user-action-btn, clicking...');
    await actionBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const menuPath = path.join(ARTIFACT_DIR, 'user_row_action_menu_1440.png');
    await page.screenshot({ path: menuPath, fullPage: false });
    console.log(`Saved: ${menuPath}`);

    // Click Reset Password
    const clicked = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button, .user-row-dropdown-item'));
      const item = items.find(el => el.textContent && el.textContent.includes('Reset Password'));
      if (item) {
        item.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('Clicked Reset Password, waiting for modal...');
      await new Promise(r => setTimeout(r, 800));
      const modalPath = path.join(ARTIFACT_DIR, 'user_reset_password_modal_1440.png');
      await page.screenshot({ path: modalPath, fullPage: false });
      console.log(`Saved: ${modalPath}`);
    }
  }

  // Reload and test search for "superadmin"
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const searchInput = await page.$('.users-search-input, input[placeholder*="Search"]');
  if (searchInput) {
    console.log('Typing search "superadmin"...');
    await searchInput.type('superadmin');
    await new Promise(r => setTimeout(r, 1500));
    const searchPath = path.join(ARTIFACT_DIR, 'user_search_results_1440.png');
    await page.screenshot({ path: searchPath, fullPage: false });
    console.log(`Saved: ${searchPath}`);
  }

  await browser.close();
  console.log('Done!');
})();

