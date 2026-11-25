const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const artifactDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getFreshToken() {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
      if (cached && cached.token && (Date.now() - (cached.time || 0) < 600000)) {
        return cached.token;
      }
    } catch (e) {}
  }

  try {
    const reqData = JSON.stringify({ phone: '+16505550001' });
    const otpRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/request',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
    }, reqData);
    const challengeId = JSON.parse(otpRes.body).data?.challengeId;

    const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
    const verifyRes = await httpRequest({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/verify',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
    }, verifyData);
    const token = JSON.parse(verifyRes.body).data?.accessToken;
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, time: Date.now() }));
    return token;
  } catch (err) {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;
    }
    throw err;
  }
}

async function runVerification() {
  console.log('=== Starting Branding & Identity Screen Verification ===');
  const token = await getFreshToken();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Seed session
  await page.goto('http://localhost:5173/');
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    }));
  }, token);

  console.log('Navigating to http://localhost:5173/admin/settings/branding...');
  await page.goto('http://localhost:5173/admin/settings/branding', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Current page URL after navigation:', page.url());

  // 1. Audit Navigation & Active State
  const navAudit = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
    let settingsActive = false;
    let reportsActive = false;
    let referralsActive = false;

    for (const item of items) {
      const text = item.innerText || '';
      if (text.includes('System Settings')) settingsActive = item.classList.contains('active');
      if (text.includes('Reports')) reportsActive = item.classList.contains('active');
      if (text.includes('Referrals')) referralsActive = item.classList.contains('active');
    }

    const breadcrumbs = document.querySelector('.branding-breadcrumb')?.innerText || '';
    const tabs = Array.from(document.querySelectorAll('.branding-tab-btn')).map(t => ({
      label: t.innerText.trim(),
      active: t.classList.contains('active')
    }));

    return {
      settingsActive,
      reportsActive,
      referralsActive,
      breadcrumbs,
      tabs
    };
  });

  console.log('Navigation & Tabs Audit:', JSON.stringify(navAudit, null, 2));

  // 2. Audit Titles & Badges
  const titleAudit = await page.evaluate(() => {
    const pageTitle = document.querySelector('.branding-title')?.innerText || '';
    const systemBadge = document.querySelector('.branding-system-badge')?.innerText || '';
    const systemSubtext = document.querySelector('.branding-system-subtext')?.innerText || '';
    const liveSyncedBadge = document.querySelector('.branding-live-badge')?.innerText || '';

    return {
      pageTitle,
      systemBadge,
      systemSubtext,
      liveSyncedBadge
    };
  });

  console.log('Title & Badges Audit:', JSON.stringify(titleAudit, null, 2));

  // 3. Audit Color Palette Controls
  const paletteAudit = await page.evaluate(() => {
    const primaryInput = document.querySelector('#primaryColorInput')?.value || '';
    const secondaryInput = document.querySelector('#secondaryColorInput')?.value || '';
    const accentInput = document.querySelector('#accentColorInput')?.value || '';

    return {
      primaryInput,
      secondaryInput,
      accentInput
    };
  });

  console.log('Palette Audit:', JSON.stringify(paletteAudit, null, 2));

  // 4. Audit Brand Assets
  const assetsAudit = await page.evaluate(() => {
    const logoImg = document.querySelector('#careid-logo-preview')?.getAttribute('src') || '';
    const hasReplaceBtn = !!document.querySelector('#btn-replace-logo');
    const hasFaviconBtn = !!document.querySelector('#btn-upload-favicon');
    const footerText = document.querySelector('#portalFooterText')?.value || '';
    const charCounter = document.querySelector('#footer-char-counter')?.innerText || '';

    return {
      logoImgLoaded: !!logoImg,
      hasReplaceBtn,
      hasFaviconBtn,
      footerText,
      charCounter
    };
  });

  console.log('Assets & Footer Audit:', JSON.stringify(assetsAudit, null, 2));

  // 5. Test Live Hex Modification & Swatch Update
  console.log('Testing color editing and swatch reactive update...');
  await page.focus('#primaryColorInput');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.type('#123456');

  const modifiedPrimary = await page.evaluate(() => document.querySelector('#primaryColorInput')?.value);
  console.log(`Modified Primary Hex: "${modifiedPrimary}"`);

  // Test Discard Changes
  console.log('Testing Discard Changes button...');
  await page.click('.btn-branding-discard');
  await new Promise(r => setTimeout(r, 600));

  const restoredPrimary = await page.evaluate(() => document.querySelector('#primaryColorInput')?.value);
  console.log(`Restored Primary Hex after Discard: "${restoredPrimary}"`);

  // Test Change Login Background button
  console.log('Testing Change Login Background button...');
  await page.click('#btn-change-bg');
  await new Promise(r => setTimeout(r, 400));

  // Dismiss toast if present to get clean screenshots
  await page.evaluate(() => {
    const toastClose = document.querySelector('[role="status"] button');
    if (toastClose) toastClose.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Capture Desktop Screenshot (Top half)
  const desktopShot = path.join(artifactDir, 'system_settings_branding_desktop.png');
  await page.screenshot({ path: desktopShot, fullPage: false });
  console.log(`Saved desktop screenshot: ${desktopShot}`);

  // Scroll canvas to bottom to capture bottom section
  await page.evaluate(() => {
    const canvas = document.querySelector('.branding-scroll-canvas');
    if (canvas) canvas.scrollTop = canvas.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 400));
  const bottomShot = path.join(artifactDir, 'system_settings_branding_bottom.png');
  await page.screenshot({ path: bottomShot, fullPage: false });
  console.log(`Saved bottom screenshot: ${bottomShot}`);

  // Reset scroll
  await page.evaluate(() => {
    const canvas = document.querySelector('.branding-scroll-canvas');
    if (canvas) canvas.scrollTop = 0;
  });

  // Capture 1920x1080 Screenshot
  await page.setViewport({ width: 1920, height: 1080 });
  await new Promise(r => setTimeout(r, 500));
  const fhdShot = path.join(artifactDir, 'system_settings_branding_1920x1080.png');
  await page.screenshot({ path: fhdShot, fullPage: false });
  console.log(`Saved 1920x1080 screenshot: ${fhdShot}`);

  // Capture Fullpage Screenshot (to see all cards including Compliance Footer)
  const fullpageShot = path.join(artifactDir, 'system_settings_branding_fullpage.png');
  await page.screenshot({ path: fullpageShot, fullPage: true });
  console.log(`Saved fullpage screenshot: ${fullpageShot}`);

  // Capture Tablet Screenshot
  await page.setViewport({ width: 1024, height: 768 });
  await new Promise(r => setTimeout(r, 500));
  const tabletShot = path.join(artifactDir, 'system_settings_branding_tablet.png');
  await page.screenshot({ path: tabletShot, fullPage: false });
  console.log(`Saved tablet screenshot: ${tabletShot}`);

  // Capture Mobile Screenshot
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 500));
  const mobileShot = path.join(artifactDir, 'system_settings_branding_mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: false });
  console.log(`Saved mobile screenshot: ${mobileShot}`);

  await browser.close();

  // Assertions
  const checks = [
    { name: 'System Settings sidebar active', pass: navAudit.settingsActive === true },
    { name: 'Reports sidebar NOT active', pass: navAudit.reportsActive === false },
    { name: 'Referrals sidebar NOT active', pass: navAudit.referralsActive === false },
    { name: 'Six Tabs present', pass: navAudit.tabs.length === 6 },
    { name: 'Branding & Identity Tab Active', pass: navAudit.tabs[1].active === true },
    { name: 'General Tab Inactive', pass: navAudit.tabs[0].active === false },
    { name: 'Page Title match', pass: titleAudit.pageTitle.includes('Branding & Identity') },
    { name: 'Design System Badge', pass: titleAudit.systemBadge === 'DESIGN SYSTEM V3.2' },
    { name: 'Live Synced Badge', pass: titleAudit.liveSyncedBadge === 'Live Synced' },
    { name: 'Primary Color default', pass: paletteAudit.primaryInput === '#3F1D8B' },
    { name: 'Secondary Color default', pass: paletteAudit.secondaryInput === '#00E5FF' },
    { name: 'Accent Color default', pass: paletteAudit.accentInput === '#7C4DFF' },
    { name: 'CareID Logo loaded', pass: assetsAudit.logoImgLoaded === true },
    { name: 'Replace Logo button present', pass: assetsAudit.hasReplaceBtn === true },
    { name: 'Upload Favicon button present', pass: assetsAudit.hasFaviconBtn === true },
    { name: 'Footer text present', pass: assetsAudit.footerText.includes('Care ID Health Systems') },
    { name: 'Character counter rendered', pass: assetsAudit.charCounter.includes('/ 200') },
    { name: 'Discard restores primary', pass: restoredPrimary === '#3F1D8B' }
  ];

  console.log('\n=== VERIFICATION RESULTS ===');
  checks.forEach(c => console.log(`${c.pass ? '✅ PASS' : '❌ FAIL'}: ${c.name}`));
  const allPassed = checks.every(c => c.pass);
  console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL VERIFICATIONS PASSED ✅' : 'FAILURES OCCURRED ❌'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
