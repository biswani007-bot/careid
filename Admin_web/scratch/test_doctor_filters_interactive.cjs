const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const cachedToken = JSON.parse(fs.readFileSync(path.join(__dirname, 'cached_token.json'), 'utf8'));

(async () => {
  console.log('Testing interactive filters and modal...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
  await page.evaluate((token, refreshToken, user) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken || token);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, cachedToken.accessToken, cachedToken.refreshToken, cachedToken.user);

  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // 1. Test Filter: Click "Pending"
  console.log('Clicking "Pending" pill filter...');
  const pendingPill = await page.$('.doctors-pill:nth-child(3)');
  if (pendingPill) {
    await pendingPill.click();
    await new Promise(r => setTimeout(r, 1000));
    const filteredRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-table tbody tr')).map(r => {
        return r.querySelector('.doctors-doctor-name')?.textContent?.trim();
      }).filter(Boolean);
    });
    console.log('Pending Filtered Rows:', filteredRows);
    const pendingPath = path.join(ARTIFACT_DIR, 'doctor_filter_pending_1440.png');
    await page.screenshot({ path: pendingPath });
  }

  // 2. Test Search: Type "Sarah"
  console.log('Typing "Sarah" in search input...');
  const searchInput = await page.$('.patients-header-search-input');
  if (searchInput) {
    // Reset to "All" first
    const allPill = await page.$('.doctors-pill:nth-child(1)');
    if (allPill) await allPill.click();
    await new Promise(r => setTimeout(r, 500));

    await searchInput.type('Sarah');
    await new Promise(r => setTimeout(r, 1200));

    const searchRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-table tbody tr')).map(r => {
        return r.querySelector('.doctors-doctor-name')?.textContent?.trim();
      }).filter(Boolean);
    });
    console.log('Search "Sarah" Rows:', searchRows);
    const searchPath = path.join(ARTIFACT_DIR, 'doctor_search_sarah_1440.png');
    await page.screenshot({ path: searchPath });
  }

  // 3. Clear search and test Reset Password Modal notice
  await page.evaluate(() => {
    const input = document.querySelector('.patients-header-search-input');
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Opening Reset Password Dialog...');
  const kebabBtn = await page.$('.doctors-action-btn');
  if (kebabBtn) {
    await kebabBtn.click();
    await new Promise(r => setTimeout(r, 500));
    
    // Find "Reset Doctor Password" button
    const resetMenuBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.doctors-row-menu-item'));
      return btns.find(b => b.textContent.includes('Reset'));
    });
    if (resetMenuBtn) {
      await resetMenuBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const modalPath = path.join(ARTIFACT_DIR, 'doctor_reset_password_modal_1440.png');
      await page.screenshot({ path: modalPath });
      console.log('Saved Reset Password Modal screenshot:', modalPath);
    }
  }

  await browser.close();
  console.log('Interactive verification completed successfully!');
})().catch(err => {
  console.error('Interactive test error:', err);
  process.exit(1);
});

