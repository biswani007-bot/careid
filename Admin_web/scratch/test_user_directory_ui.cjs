const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const cachedToken = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

(async () => {
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Pre-seed authentication tokens into localStorage
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

  console.log('Navigating to http://localhost:5173/admin/users...');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 1: Desktop User Directory
  const desktopPath = path.join(ARTIFACT_DIR, 'user_directory_desktop_1440.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log(`Saved: ${desktopPath}`);

  // Screenshot 2: Mobile User Directory (390x844)
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 1000));
  const mobilePath = path.join(ARTIFACT_DIR, 'user_directory_mobile_390.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`Saved: ${mobilePath}`);

  // Reset viewport to desktop
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Find and click the first kebab button
  const kebabBtn = await page.$('.user-row-actions-btn, .user-row-action-trigger, [aria-label*="Actions"], button.user-row-kebab');
  if (kebabBtn) {
    console.log('Clicking row action kebab menu...');
    await kebabBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const menuPath = path.join(ARTIFACT_DIR, 'user_row_action_menu_1440.png');
    await page.screenshot({ path: menuPath, fullPage: false });
    console.log(`Saved: ${menuPath}`);

    // Click "Reset Password" via evaluate
    const clickedReset = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, .user-row-dropdown-item'));
      const resetBtn = buttons.find(b => b.textContent && b.textContent.includes('Reset Password'));
      if (resetBtn) {
        resetBtn.click();
        return true;
      }
      return false;
    });

    if (clickedReset) {
      console.log('Clicked Reset Password option...');
      await new Promise(r => setTimeout(r, 600));
      const resetModalPath = path.join(ARTIFACT_DIR, 'user_reset_password_modal_1440.png');
      await page.screenshot({ path: resetModalPath, fullPage: false });
      console.log(`Saved: ${resetModalPath}`);

      // Close modal
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancel = buttons.find(b => b.textContent && b.textContent.includes('Cancel'));
        if (cancel) cancel.click();
      });
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Screenshot 4: Create User Page
  console.log('Navigating to http://localhost:5173/admin/users/create...');
  await page.goto('http://localhost:5173/admin/users/create', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const createPath = path.join(ARTIFACT_DIR, 'user_create_desktop_1440.png');
  await page.screenshot({ path: createPath, fullPage: false });
  console.log(`Saved: ${createPath}`);

  // Screenshot 5: User Details Page
  console.log('Navigating to http://localhost:5173/admin/users/bc6f6875-434c-4050-b893-07343cc27986...');
  await page.goto('http://localhost:5173/admin/users/bc6f6875-434c-4050-b893-07343cc27986', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const detailsPath = path.join(ARTIFACT_DIR, 'user_details_desktop_1440.png');
  await page.screenshot({ path: detailsPath, fullPage: false });
  console.log(`Saved: ${detailsPath}`);

  // Test Search Filter: Go back to /admin/users and search for "superadmin"
  console.log('Testing search on User Directory...');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const searchInput = await page.$('.user-search-input, input[placeholder*="Search"]');
  if (searchInput) {
    await searchInput.type('superadmin');
    await new Promise(r => setTimeout(r, 1500));
    const searchPath = path.join(ARTIFACT_DIR, 'user_search_results_1440.png');
    await page.screenshot({ path: searchPath, fullPage: false });
    console.log(`Saved: ${searchPath}`);
  }

  await browser.close();
  console.log('Browser test complete! All screenshots saved.');
})();
