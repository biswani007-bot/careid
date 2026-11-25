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
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ token, time: Date.now() }));
    console.log('Fresh token acquired successfully.');
    return token;
  } catch (err) {
    console.error('Failed to get fresh token, checking cache:', err);
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;
    }
    throw err;
  }
}

async function verify() {
  const token = await getFreshToken();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Seed session with authentic careid keys
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

  const testRoutes = [
    {
      name: 'referral_activity_report',
      url: 'http://localhost:5173/admin/reports/referral-activity',
      expectedReportsActive: true,
      expectedReferralsActive: false,
      expectedReferralsExpanded: false,
      screenshot: path.join(artifactDir, 'sidebar_verified_referral_activity.png')
    },
    {
      name: 'ocr_performance_report',
      url: 'http://localhost:5173/admin/reports/ocr-performance',
      expectedReportsActive: true,
      expectedReferralsActive: false,
      expectedReferralsExpanded: false,
      screenshot: path.join(artifactDir, 'sidebar_verified_ocr_performance.png')
    },
    {
      name: 'reports_dashboard',
      url: 'http://localhost:5173/admin/reports',
      expectedReportsActive: true,
      expectedReferralsActive: false,
      expectedReferralsExpanded: false,
      screenshot: path.join(artifactDir, 'sidebar_verified_reports_dashboard.png')
    },
    {
      name: 'referrals_overview',
      url: 'http://localhost:5173/admin/referrals',
      expectedReportsActive: false,
      expectedReferralsActive: true,
      expectedReferralsExpanded: true,
      screenshot: path.join(artifactDir, 'sidebar_verified_referrals_overview.png')
    },
    {
      name: 'referrals_audit',
      url: 'http://localhost:5173/admin/referrals/audit',
      expectedReportsActive: false,
      expectedReferralsActive: true,
      expectedReferralsExpanded: true,
      screenshot: path.join(artifactDir, 'sidebar_verified_referrals_audit.png')
    }
  ];

  const results = [];

  for (const test of testRoutes) {
    console.log(`\n========================================`);
    console.log(`Testing route: ${test.url} (${test.name})`);
    await page.goto(test.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Capture sidebar states
    const sidebarState = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-nav-item'));
      let reportsActive = false;
      let referralsActive = false;
      let referralsExpanded = false;

      for (const item of items) {
        const text = item.innerText || '';
        const isActive = item.classList.contains('active');
        const isExp = item.getAttribute('aria-expanded') === 'true';

        if (text.includes('Reports')) {
          reportsActive = isActive;
        }
        if (text.includes('Referrals')) {
          referralsActive = isActive;
          referralsExpanded = isExp;
        }
      }

      // Check subnav items under referrals
      const subnavItems = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
      const activeSubnavs = subnavItems.filter(s => s.classList.contains('active')).map(s => s.innerText.trim());

      return {
        reportsActive,
        referralsActive,
        referralsExpanded,
        activeSubnavs,
        totalSubnavVisible: subnavItems.length
      };
    });

    console.log(`Results for ${test.name}:`, JSON.stringify(sidebarState, null, 2));

    const reportsMatch = sidebarState.reportsActive === test.expectedReportsActive;
    const referralsMatch = sidebarState.referralsActive === test.expectedReferralsActive;
    const expandedMatch = sidebarState.referralsExpanded === test.expectedReferralsExpanded;

    const passed = reportsMatch && referralsMatch && expandedMatch;

    console.log(`Reports active match: ${reportsMatch} (expected ${test.expectedReportsActive}, actual ${sidebarState.reportsActive})`);
    console.log(`Referrals active match: ${referralsMatch} (expected ${test.expectedReferralsActive}, actual ${sidebarState.referralsActive})`);
    console.log(`Referrals expanded match: ${expandedMatch} (expected ${test.expectedReferralsExpanded}, actual ${sidebarState.referralsExpanded})`);
    console.log(`Verification: ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    await page.screenshot({ path: test.screenshot, fullPage: false });
    console.log(`Saved screenshot to: ${test.screenshot}`);

    results.push({
      ...test,
      actual: sidebarState,
      passed
    });
  }

  await browser.close();

  const allPassed = results.every(r => r.passed);
  console.log(`\n========================================`);
  console.log(`OVERALL TEST RESULT: ${allPassed ? 'ALL PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log(`========================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
