const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
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
    if (token) {
      fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, time: Date.now() }));
      return token;
    }
  } catch (err) {
    console.error('Failed to get fresh token:', err);
  }
  return null;
}

async function runNavigationAudit() {
  console.log('🚀 Starting Comprehensive Navigation & Redirect Audit...');
  const token = await getFreshToken();
  if (!token) {
    console.error('❌ Could not obtain authentication token.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore routine favicon or benign analytics errors
      if (!text.includes('favicon') && !text.includes('status of 404')) {
        errors.push(`[Console Error] ${text}`);
      }
    }
  });

  // Inject session authentication before accessing protected routes
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
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

  async function checkNoPlaceholderModal() {
    const modalText = await page.evaluate(() => {
      const toasts = Array.from(document.querySelectorAll('.user-details-toast, .careid-toast-card, .toast, [role="alert"], [role="status"]'));
      return toasts.map(t => t.textContent).join(' ');
    });
    const hasUnwantedPlaceholder = modalText.toLowerCase().includes('subsequent phase') ||
      modalText.toLowerCase().includes('scheduled for incremental development');
    return !hasUnwantedPlaceholder;
  }

  function recordStep(id, title, passed, detail) {
    console.log(`${passed ? '✅' : '❌'} [Step ${id}] ${title}: ${detail}`);
    results.push({ id, title, passed, detail });
  }

  // Helper to click sidebar nav items
  async function clickSidebarItem(labelRegex) {
    await page.waitForSelector('.sidebar-nav-item', { timeout: 5000 }).catch(() => {});
    const clicked = await page.evaluate((regexStr) => {
      const regex = new RegExp(regexStr, 'i');
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item, .sidebar-subnav-item'));
      const match = items.find(el => regex.test(el.textContent || ''));
      if (match) {
        match.click();
        return true;
      }
      return false;
    }, labelRegex.source);
    await new Promise(r => setTimeout(r, 800));
    return clicked;
  }

  // --- Step 1: Navigate from Dashboard to Users ---
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.sidebar-nav-item');
  await new Promise(r => setTimeout(r, 1000));
  await clickSidebarItem(/^Users$/i);
  const url1 = page.url();
  const ok1 = url1.includes('/admin/users') && await checkNoPlaceholderModal();
  recordStep(1, 'Dashboard to Users', ok1, `URL: ${url1}`);

  // --- Step 2: Navigate from Users to Patients ---
  await clickSidebarItem(/Patients/);
  const url2 = page.url();
  const ok2 = url2.includes('/admin/patients') && await checkNoPlaceholderModal();
  recordStep(2, 'Users to Patients', ok2, `URL: ${url2}`);

  // --- Step 3: Navigate from Patients to Doctors ---
  await clickSidebarItem(/Doctors/);
  const url3 = page.url();
  const ok3 = url3.includes('/admin/doctors') && await checkNoPlaceholderModal();
  recordStep(3, 'Patients to Doctors', ok3, `URL: ${url3}`);

  // --- Step 4: Navigate from Doctors to Facilities ---
  await clickSidebarItem(/Facilities/);
  const url4 = page.url();
  const ok4 = url4.includes('/admin/facilities') && await checkNoPlaceholderModal();
  recordStep(4, 'Doctors to Facilities', ok4, `URL: ${url4}`);

  // --- Step 5: Navigate to Health Records ---
  await clickSidebarItem(/Health Records/);
  const url5 = page.url();
  const ok5 = url5.includes('/admin/records') && await checkNoPlaceholderModal();
  recordStep(5, 'Facilities to Health Records', ok5, `URL: ${url5}`);

  // --- Step 6: Navigate to OCR Verification ---
  await clickSidebarItem(/OCR Verification/);
  const url6 = page.url();
  const ok6 = url6.includes('/admin/ocr/queue') && await checkNoPlaceholderModal();
  recordStep(6, 'Health Records to OCR Verification', ok6, `URL: ${url6}`);

  // --- Step 7: Navigate from OCR Verification to Referrals ---
  await clickSidebarItem(/Referrals/);
  const url7 = page.url();
  const ok7 = (url7.includes('/admin/referrals') || url7.includes('/admin/referral-dashboard')) && await checkNoPlaceholderModal();
  recordStep(7, 'OCR Verification to Referrals', ok7, `URL: ${url7}`);

  // --- Step 8: Navigate from Referrals to Reports ---
  await clickSidebarItem(/Reports/);
  const url8 = page.url();
  const ok8 = url8.includes('/admin/reports') && !url8.includes('/ocr-performance') && await checkNoPlaceholderModal();
  recordStep(8, 'Referrals to Reports', ok8, `URL: ${url8}`);

  // --- Step 9: Open Referral Activity Report ---
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.reports-action-card'));
    const refCard = cards.find(c => c.textContent?.includes('Referral Activity'));
    if (refCard) refCard.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const url9 = page.url();
  const ok9 = url9.includes('/admin/reports/referral-activity') && await checkNoPlaceholderModal();
  recordStep(9, 'Open Referral Activity Report', ok9, `URL: ${url9}`);

  // --- Step 10: Open OCR Performance Report ---
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.reports-action-card'));
    const ocrCard = cards.find(c => c.textContent?.includes('OCR Performance'));
    if (ocrCard) ocrCard.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const url10 = page.url();
  const ok10 = url10.includes('/admin/reports/ocr-performance') && await checkNoPlaceholderModal();
  recordStep(10, 'Open OCR Performance Report', ok10, `URL: ${url10}`);

  // --- Step 11: Navigate to System Settings ---
  await clickSidebarItem(/System Settings/);
  const url11 = page.url();
  const ok11 = url11.includes('/admin/settings/general') && await checkNoPlaceholderModal();
  recordStep(11, 'Navigate to System Settings', ok11, `URL: ${url11}`);

  // --- Step 12: Open General & Organization ---
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.settings-tab-btn'));
    const tab1 = tabs.find(t => t.textContent?.includes('General & Organization'));
    if (tab1) tab1.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const url12 = page.url();
  const ok12 = url12.includes('/admin/settings/general') && await checkNoPlaceholderModal();
  recordStep(12, 'Open General & Organization Tab', ok12, `URL: ${url12}`);

  // --- Step 13: Open Branding & Identity ---
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.settings-tab-btn'));
    const tab2 = tabs.find(t => t.textContent?.includes('Branding & Identity'));
    if (tab2) tab2.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const url13 = page.url();
  const ok13 = url13.includes('/admin/settings/branding') && await checkNoPlaceholderModal();
  recordStep(13, 'Open Branding & Identity Tab', ok13, `URL: ${url13}`);

  // --- Step 14: Navigate to Security Policies ---
  await page.evaluate(() => {
    const proceedBtn = document.querySelector('#btn-proceed-security') ||
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Proceed to Security Policies'));
    if (proceedBtn) proceedBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));
  const url14 = page.url();
  const ok14 = url14.includes('/admin/settings/security') && await checkNoPlaceholderModal();
  recordStep(14, 'Navigate to Security Policies', ok14, `URL: ${url14}`);

  // --- Step 15: Open Audit Logs ---
  await clickSidebarItem(/Audit Logs/);
  const url15 = page.url();
  const ok15 = (url15.includes('/admin/audit') || url15.includes('/admin/referrals/audit')) && await checkNoPlaceholderModal();
  recordStep(15, 'Open Audit Logs', ok15, `URL: ${url15}`);

  // --- Step 16: Browser Back & Forward ---
  await page.goBack();
  await new Promise(r => setTimeout(r, 500));
  const urlBack = page.url();
  await page.goForward();
  await new Promise(r => setTimeout(r, 500));
  const urlForward = page.url();
  const ok16 = urlBack.includes('/admin/settings/security') && (urlForward.includes('/admin/audit') || urlForward.includes('/admin/referrals/audit'));
  recordStep(16, 'Browser Back and Forward', ok16, `Back: ${urlBack} -> Forward: ${urlForward}`);

  // --- Step 17: Refresh a nested route directly ---
  await page.goto('http://localhost:5173/admin/reports/ocr-performance', { waitUntil: 'networkidle2' });
  await page.reload({ waitUntil: 'networkidle2' });
  const url17 = page.url();
  const ok17 = url17.includes('/admin/reports/ocr-performance') && await checkNoPlaceholderModal();
  recordStep(17, 'Direct URL and Refresh Nested Route', ok17, `URL after reload: ${url17}`);

  // --- Step 18: Dashboard Quick Actions ---
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2' });
  // Click Add Doctor quick action
  const qaDoctorClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.quick-action-btn')).find(b => b.textContent?.includes('Add Doctor'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));
  const urlQa1 = page.url();

  // Return to dashboard and click Generate Report quick action
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2' });
  const qaReportClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.quick-action-btn')).find(b => b.textContent?.includes('Generate Report'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));
  const urlQa2 = page.url();
  const ok18 = qaDoctorClicked && urlQa1.includes('/admin/doctors/create') && qaReportClicked && urlQa2.includes('/admin/reports');
  recordStep(18, 'Dashboard Quick Actions', ok18, `Add Doctor: ${urlQa1}, Generate Report: ${urlQa2}`);

  // --- Step 19: Breadcrumbs Navigation ---
  await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle2' });
  const breadcrumbClicked = await page.evaluate(() => {
    const portalBtn = Array.from(document.querySelectorAll('.settings-breadcrumb button')).find(b => b.textContent?.includes('Admin Portal'));
    if (portalBtn) { portalBtn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));
  const url19 = page.url();
  const ok19 = breadcrumbClicked && url19.includes('/admin/dashboard');
  recordStep(19, 'Breadcrumbs Navigation', ok19, `Navigated to: ${url19}`);

  // --- Step 20: Navigate after opening and closing a legitimate modal ---
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  // Open legitimate table row modal or filter modal
  const modalOpened = await page.evaluate(() => {
    const rowBtn = document.querySelector('.referral-table tbody tr button');
    if (rowBtn) { rowBtn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 400));
  // Dismiss modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('.referral-modal-backdrop') || document.querySelector('button[aria-label="Close"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  // Now navigate to Doctors
  await clickSidebarItem(/Doctors/);
  const url20 = page.url();
  const ok20 = url20.includes('/admin/doctors') && await checkNoPlaceholderModal();
  recordStep(20, 'Navigate after Modal Open/Close', ok20, `Navigated to: ${url20}`);

  // --- Responsive checks ---
  await page.setViewport({ width: 768, height: 1024 }); // Tablet
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  const tabletOk = await page.evaluate(() => document.querySelector('.reports-dashboard-wrapper') !== null);

  await page.setViewport({ width: 390, height: 844 }); // Mobile
  await page.goto('http://localhost:5173/admin/settings/general', { waitUntil: 'networkidle2' });
  const mobileOk = await page.evaluate(() => document.querySelector('.settings-wrapper') !== null);

  console.log(`📱 Responsive checks: Tablet=${tabletOk}, Mobile=${mobileOk}`);

  // Capture full audit screenshot
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(artifactDir, 'navigation_audit_dashboard.png') });

  await browser.close();

  console.log('\n======================================================');
  console.log(`TOTAL CHECKS: ${results.length}`);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`PASSED: ${passedCount} / ${results.length}`);
  if (errors.length > 0) {
    console.log(`Logged Console Errors: ${errors.length}`);
  }
  console.log('======================================================');

  if (passedCount === results.length) {
    console.log('🎉 ALL 20 NAVIGATION CHECKS PASSED PERFECTLY!');
  } else {
    console.log('⚠️ Some checks failed. Review results.');
  }
}

runNavigationAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
