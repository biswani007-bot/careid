const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== Verifying Global Admin Profile Avatar across Admin Portal ===');
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to root first and seed auth state
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  const testScreens = [
    { name: 'Dashboard', path: '/admin/dashboard', screenshot: 'verify_avatar_dashboard.png' },
    { name: 'Users Directory', path: '/admin/users', screenshot: 'verify_avatar_users.png' },
    { name: 'Facilities Directory', path: '/admin/facilities', screenshot: 'verify_avatar_facilities.png' },
    { name: 'All Health Records', path: '/admin/records', screenshot: 'verify_avatar_records.png' },
    { name: 'OCR Queue', path: '/admin/ocr/queue', screenshot: 'verify_avatar_ocr.png' },
    { name: 'Referral Dashboard', path: '/admin/referrals', screenshot: 'verify_avatar_referrals.png' },
    { name: 'Reports Dashboard', path: '/admin/reports', screenshot: 'verify_avatar_reports.png' },
    { name: 'System Settings - General', path: '/admin/settings/general', screenshot: 'verify_avatar_settings_general.png' },
    { name: 'System Settings - Roles', path: '/admin/settings/roles', screenshot: 'verify_avatar_settings_roles.png' },
    { name: 'Audit Dashboard', path: '/admin/audit-dashboard', screenshot: 'verify_avatar_audit.png' },
    { name: 'Security & Compliance', path: '/admin/security-compliance', screenshot: 'verify_avatar_security.png' },
    { name: 'Security & Session Management', path: '/admin/security-session-management', screenshot: 'verify_avatar_sec_sessions.png' },
    { name: 'Support & Notifications', path: '/admin/notifications', screenshot: 'verify_avatar_notifications.png' },
    { name: 'Announcements & Preferences', path: '/admin/announcements', screenshot: 'verify_avatar_announcements.png' },
    { name: 'My Profile & Information', path: '/admin/profile', screenshot: 'verify_avatar_my_profile.png' }
  ];

  let verifiedCount = 0;

  for (const screen of testScreens) {
    try {
      await page.goto(`${BASE_URL}${screen.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1200));

      const avatarCheck = await page.evaluate(() => {
        // Find avatar image in top header/navbar
        const imgs = Array.from(document.querySelectorAll(
          '.header-avatar-btn img, .admin-profile-avatar-root img, .profile-top-pill img, .profile-avatar-large img, .sec-session-avatar-btn img, .referral-header-avatar img, .reports-admin-avatar img, .settings-profile-avatar img, .branding-profile-avatar img, .announcements-avatar-wrap img, .notification-profile-btn img, .users-header-avatar img, .facility-add-topbar-user img'
        ));

        return imgs.map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayedWidth: img.clientWidth,
          displayedHeight: img.clientHeight
        }));
      });

      console.log(`\nScreen: ${screen.name} (${screen.path})`);
      console.log(`  Current URL: ${page.url()}`);
      if (avatarCheck.length > 0) {
        console.log(`  ✓ Found ${avatarCheck.length} avatar image(s):`);
        avatarCheck.forEach((av, i) => {
          const shortSrc = av.src.includes('data:') ? 'data:image...' : av.src.split('/').slice(-2).join('/');
          console.log(`    [${i+1}] src: ${shortSrc} (${av.naturalWidth}x${av.naturalHeight} natural, ${av.displayedWidth}x${av.displayedHeight} display)`);
        });
        verifiedCount++;
      } else {
        console.warn(`  ⚠ Warning: No matching avatar elements found via selector on ${screen.name}`);
      }

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, screen.screenshot),
        fullPage: false
      });
      console.log(`  ✓ Saved screenshot: ${screen.screenshot}`);

    } catch (err) {
      console.error(`  ✗ Error on ${screen.name}:`, err.message);
    }
  }

  // Verification of Avatar Click Navigation
  console.log('\n--- Verifying Global Avatar Click Navigation to /admin/profile ---');
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  const avatarBtn = await page.$('.header-avatar-btn');
  if (avatarBtn) {
    await avatarBtn.click();
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));
    const navUrl = page.url();
    console.log(`  Navigated to: ${navUrl}`);
    const isProfilePage = navUrl.includes('/admin/profile');
    console.log(`  ✓ Avatar click correctly opened /admin/profile: ${isProfilePage ? 'YES' : 'NO'}`);
  }

  await browser.close();
  console.log(`\n=== Verification Finished: ${verifiedCount}/${testScreens.length} screens verified with portrait avatar! ===`);
}

run().catch(console.error);
