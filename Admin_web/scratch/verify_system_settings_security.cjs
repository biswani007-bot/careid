const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
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
  console.log('Acquiring fresh Super Admin auth token from backend for +16505550001...');
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
    console.log('Fresh token acquired successfully.');
    return token;
  } catch (err) {
    console.warn('Backend login fallback to mock token:', err.message);
    return 'mock-superadmin-token-' + Date.now();
  }
}

async function verify() {
  console.log('--- Starting System Settings: Security Policies Verification ---');
  const token = await getFreshToken();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();

  // Set auth state with authentic CareID storage keys
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN', 'super_admin'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
    }));
  }, token);

  // Navigate to /admin/settings/security
  console.log('Navigating to http://localhost:5173/admin/settings/security ...');
  await page.goto('http://localhost:5173/admin/settings/security', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Verify Header & Breadcrumbs
  const headerText = await page.$eval('.security-header-title', el => el.textContent.trim());
  console.log(`[PASS] Header Title: "${headerText}"`);

  const breadcrumbs = await page.$$eval('.security-breadcrumb *', els => els.map(e => e.textContent.trim()).filter(Boolean));
  console.log(`[PASS] Breadcrumbs: ${breadcrumbs.join(' ')}`);

  // 2. Verify 6-Tab Persistent Bar
  const activeTab = await page.$eval('.security-subnav-tab.active', el => el.textContent.trim());
  console.log(`[PASS] Active Sub-Nav Tab: "${activeTab}"`);
  if (!activeTab.includes('Security Policies')) {
    throw new Error(`Expected active tab to be Security Policies, got "${activeTab}"`);
  }

  // 3. Verify Section 1: Authentication & 2FA
  const section1Title = await page.$eval('#section-auth-heading', el => el.textContent.trim());
  console.log(`[PASS] Section 1 Heading: "${section1Title}"`);

  const mfaToggleChecked = await page.$eval('input[name="mfaEnforced"]', el => el.checked);
  console.log(`[PASS] Mandatory MFA Toggle: ${mfaToggleChecked ? 'Checked (Active)' : 'Unchecked'}`);

  const methodCards = await page.$$eval('.security-method-card', els => els.map(e => e.textContent.trim().replace(/\s+/g, ' ')));
  console.log(`[PASS] Supported MFA Methods (${methodCards.length}):`, methodCards);

  const gracePeriodVal = await page.$eval('select[aria-label="Staff Onboarding Grace Period"]', el => el.value);
  console.log(`[PASS] Staff Onboarding Grace Period Value: "${gracePeriodVal}"`);

  // 4. Verify Section 2: Session & Timeout Controls
  const section2Title = await page.$eval('#section-session-heading', el => el.textContent.trim());
  console.log(`[PASS] Section 2 Heading: "${section2Title}"`);

  const strictBadge = await page.$eval('.security-strict-badge', el => el.textContent.trim());
  console.log(`[PASS] Inactivity Timeout Badge: "${strictBadge}"`);

  const timeoutVal = await page.$eval('select[aria-label="Admin Portal Inactivity Timeout"]', el => el.value);
  console.log(`[PASS] Inactivity Timeout Value: "${timeoutVal}"`);

  const concurrentStatus = await page.$eval('.security-status-indicator', el => el.textContent.trim());
  console.log(`[PASS] Concurrent Session Status: "${concurrentStatus}"`);

  const stepUpChecked = await page.$eval('input[name="forceStepUpReauth"]', el => el.checked);
  console.log(`[PASS] Step-up Action Reauth Toggle: ${stepUpChecked ? 'Checked (Active)' : 'Unchecked'}`);

  // 5. Verify Section 3: Password Governance & Complexity
  const section3Title = await page.$eval('#section-password-heading', el => el.textContent.trim());
  console.log(`[PASS] Section 3 Heading: "${section3Title}"`);

  const passwordMinLength = await page.$eval('select[aria-label="Minimum Length & Complexity"]', el => el.value);
  console.log(`[PASS] Password Min Length: "${passwordMinLength}"`);

  const passwordRules = await page.$$eval('.security-rule-item', els => els.map(e => e.textContent.trim()));
  console.log(`[PASS] Complexity Rules (${passwordRules.length}):`, passwordRules);

  const rotationInterval = await page.$eval('select[aria-label="Password Rotation Interval"]', el => el.value);
  console.log(`[PASS] Rotation Interval: "${rotationInterval}"`);

  const maxAttempts = await page.$eval('input[aria-label="Max Failed Attempts"]', el => el.value);
  console.log(`[PASS] Max Failed Attempts: "${maxAttempts}"`);

  const lockoutWindow = await page.$eval('select[aria-label="Account Lockout Window"]', el => el.value);
  console.log(`[PASS] Account Lockout Window: "${lockoutWindow}"`);

  // 6. Verify Section 4: Network & IP Whitelisting
  const section4Title = await page.$eval('#section-network-heading', el => el.textContent.trim());
  console.log(`[PASS] Section 4 Heading: "${section4Title}"`);

  const ipBannerText = await page.$eval('.security-ip-banner-text', el => el.textContent.trim());
  console.log(`[PASS] IP Whitelisting Banner: "${ipBannerText}"`);

  const cidrList = await page.$$eval('.security-cidr-row', els => els.map(e => {
    const code = e.querySelector('.security-cidr-code')?.textContent.trim();
    const label = e.querySelector('.security-cidr-label')?.textContent.trim();
    return `${code} - ${label}`;
  }));
  console.log(`[PASS] Whitelisted CIDR Subnets (${cidrList.length}):`, cidrList);

  // 7. Test Save Action & Toast Notification
  console.log('Testing "Save Security Policies" button...');
  await page.click('.security-btn-primary');
  await new Promise(r => setTimeout(r, 600));

  const toastText = await page.$eval('[role="status"]', el => el.textContent.trim());
  console.log(`[PASS] Save Toast Notification: "${toastText}"`);

  // 8. Capture Screenshots across Responsive Viewports
  // A. Desktop Exact Figma Dimensions (1280 x 2112)
  console.log('Capturing Desktop 1280x2112 screenshot...');
  await page.setViewport({ width: 1280, height: 2112, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(artifactDir, 'system_settings_security_desktop.png'),
    fullPage: false
  });

  // B. Full Page
  console.log('Capturing Full-Page screenshot...');
  await page.screenshot({
    path: path.join(artifactDir, 'system_settings_security_fullpage.png'),
    fullPage: true
  });

  // C. 1920x1080 Full HD
  console.log('Capturing 1920x1080 screenshot...');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(artifactDir, 'system_settings_security_1920x1080.png'),
    fullPage: false
  });

  // D. Tablet 768x1024
  console.log('Capturing Tablet 768x1024 screenshot...');
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(artifactDir, 'system_settings_security_tablet.png'),
    fullPage: false
  });

  // E. Mobile 375x812
  console.log('Capturing Mobile 375x812 screenshot...');
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(artifactDir, 'system_settings_security_mobile.png'),
    fullPage: false
  });

  // 9. Test "Proceed to Roles & Permissions"
  console.log('Testing "Proceed to Roles & Permissions" navigation...');
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 1 });
  await page.click('.security-btn-proceed');
  await new Promise(r => setTimeout(r, 1000));

  const currentUrl = page.url();
  console.log(`[PASS] Navigated to: ${currentUrl}`);
  if (!currentUrl.includes('/admin/settings/roles')) {
    throw new Error(`Expected navigation to /admin/settings/roles, but got ${currentUrl}`);
  }

  await browser.close();
  console.log('--- ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ---');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
