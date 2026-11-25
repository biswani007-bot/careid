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
      if (cached && cached.token) {
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
  console.log('=== Starting CareID Admin System Settings Verification ===');
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

  console.log('Navigating to http://localhost:5173/admin/settings/general...');
  await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

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

    const breadcrumbs = document.querySelector('.settings-breadcrumb')?.innerText || '';
    const searchPlaceholder = document.querySelector('.settings-search-input')?.getAttribute('placeholder') || '';
    const profileName = document.querySelector('.settings-profile-name')?.innerText || '';
    const profileRole = document.querySelector('.settings-profile-role')?.innerText || '';

    return {
      settingsActive,
      reportsActive,
      referralsActive,
      breadcrumbs,
      searchPlaceholder,
      profileName,
      profileRole
    };
  });

  console.log('Navigation Audit:', JSON.stringify(navAudit, null, 2));

  // 2. Audit Banner & Tabs
  const bannerAndTabsAudit = await page.evaluate(() => {
    const bannerTitle = document.querySelector('.settings-banner-title')?.innerText || '';
    const bannerDesc = document.querySelector('.settings-banner-desc')?.innerText || '';
    const tabs = Array.from(document.querySelectorAll('.settings-tab-btn')).map(t => ({
      label: t.innerText.trim(),
      active: t.classList.contains('active')
    }));

    return {
      bannerTitle,
      bannerDesc,
      tabs
    };
  });

  console.log('Banner & Tabs Audit:', JSON.stringify(bannerAndTabsAudit, null, 2));

  // 3. Audit Card 1 and Card 2 Fields
  const fieldsAudit = await page.evaluate(() => {
    const card1Heading = document.querySelector('#card1-heading')?.innerText || '';
    const card2Heading = document.querySelector('#card2-heading')?.innerText || '';
    const verifiedBadge = document.querySelector('.settings-verified-badge')?.innerText || '';

    const platformName = document.querySelector('#platformName')?.value || '';
    const organizationName = document.querySelector('#organizationName')?.value || '';
    const supportEmail = document.querySelector('#supportEmail')?.value || '';
    const supportPhone = document.querySelector('#supportPhone')?.value || '';

    const primaryEnterpriseNode = document.querySelector('#primaryEnterpriseNode')?.value || '';
    const clinicalSubEntities = document.querySelector('#clinicalSubEntities')?.value || '';
    const operatingTimezone = document.querySelector('#operatingTimezone')?.value || '';
    const systemDefaultLocale = document.querySelector('#systemDefaultLocale')?.value || '';

    const helpers = Array.from(document.querySelectorAll('.settings-field-helper')).map(h => h.innerText.trim());

    return {
      card1Heading,
      card2Heading,
      verifiedBadge,
      platformName,
      organizationName,
      supportEmail,
      supportPhone,
      primaryEnterpriseNode,
      clinicalSubEntities,
      operatingTimezone,
      systemDefaultLocale,
      helpers
    };
  });

  console.log('Fields Audit:', JSON.stringify(fieldsAudit, null, 2));

  // 4. Test Form Editing & Reset Defaults
  console.log('Testing form editing and reset behavior...');
  await page.focus('#platformName');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.type('Care ID Modified Test');

  let modifiedVal = await page.evaluate(() => document.querySelector('#platformName').value);
  console.log(`Modified platformName: "${modifiedVal}"`);

  // Click Reset Defaults button in banner
  await page.click('.btn-secondary-settings');
  await new Promise(r => setTimeout(r, 600));

  let restoredVal = await page.evaluate(() => document.querySelector('#platformName').value);
  console.log(`Restored platformName after Reset Defaults: "${restoredVal}"`);

  // Capture Desktop Screenshot
  const desktopShot = path.join(artifactDir, 'system_settings_desktop.png');
  await page.screenshot({ path: desktopShot, fullPage: false });
  console.log(`Saved desktop screenshot: ${desktopShot}`);

  // Capture 1920x1080 Screenshot
  await page.setViewport({ width: 1920, height: 1080 });
  await new Promise(r => setTimeout(r, 600));
  const fhdShot = path.join(artifactDir, 'system_settings_1920x1080.png');
  await page.screenshot({ path: fhdShot, fullPage: false });
  console.log(`Saved 1920x1080 screenshot: ${fhdShot}`);

  // Capture Tablet Screenshot
  await page.setViewport({ width: 1024, height: 768 });
  await new Promise(r => setTimeout(r, 600));
  const tabletShot = path.join(artifactDir, 'system_settings_tablet.png');
  await page.screenshot({ path: tabletShot, fullPage: false });
  console.log(`Saved tablet screenshot: ${tabletShot}`);

  // Capture Mobile Screenshot
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 600));
  const mobileShot = path.join(artifactDir, 'system_settings_mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: false });
  console.log(`Saved mobile screenshot: ${mobileShot}`);

  await browser.close();

  // Assertions
  const checks = [
    { name: 'System Settings sidebar active', pass: navAudit.settingsActive === true },
    { name: 'Reports sidebar NOT active', pass: navAudit.reportsActive === false },
    { name: 'Referrals sidebar NOT active', pass: navAudit.referralsActive === false },
    { name: 'Breadcrumbs rendered', pass: navAudit.breadcrumbs.includes('Admin Portal') && navAudit.breadcrumbs.includes('General & Organization') },
    { name: 'Banner Title', pass: bannerAndTabsAudit.bannerTitle.includes('System Settings — General & Organization') },
    { name: 'Six Tabs present', pass: bannerAndTabsAudit.tabs.length === 6 },
    { name: 'Tab 1 Active', pass: bannerAndTabsAudit.tabs[0].label.includes('General & Organization') && bannerAndTabsAudit.tabs[0].active },
    { name: 'Platform Name match', pass: fieldsAudit.platformName === 'Care ID Enterprise' },
    { name: 'Org Name match', pass: fieldsAudit.organizationName === 'Mount Sinai Health System & Care ID Network' },
    { name: 'Support Email match', pass: fieldsAudit.supportEmail === 'admin-support@careid-health.org' },
    { name: 'Support Phone match', pass: fieldsAudit.supportPhone === '+1 (800) 555-0199' },
    { name: 'Primary Node match', pass: fieldsAudit.primaryEnterpriseNode === 'Mount Sinai Central Health Vault (NODE-US-EAST-01)' },
    { name: 'Sub Entities match', pass: fieldsAudit.clinicalSubEntities === '14 Licensed Clinics · 4 Emergency Hubs · 2 Lab Facilities' },
    { name: 'Timezone match', pass: fieldsAudit.operatingTimezone === 'Eastern Time (US & Canada) [UTC -05:00]' },
    { name: 'Locale match', pass: fieldsAudit.systemDefaultLocale === 'English (US) / Spanish (ES) - Bilingual Medical Pack' },
    { name: 'Verified Node badge', pass: fieldsAudit.verifiedBadge === 'Verified Node' },
    { name: 'Reset restoration', pass: restoredVal === 'Care ID Enterprise' }
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

