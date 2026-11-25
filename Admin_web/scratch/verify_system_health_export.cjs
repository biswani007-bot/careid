const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'scratch/cached_token.json';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function reqHttps(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getAdminToken() {
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    // If less than 10 mins old
    if (data.accessToken && (Date.now() - (data.time || 0) < 600000)) {
      return { token: data.accessToken, user: data.user };
    }
  }

  console.log('Obtaining fresh Super Admin token for +16505550001...');
  try {
    const phone = '+16505550001';
    const reqData = JSON.stringify({ phone });
    const otpRes = await reqHttps({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/otp/request',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
    }, reqData);

    const otpJson = JSON.parse(otpRes.body);
    const challengeId = otpJson.data?.challengeId || otpJson.challengeId;

    if (challengeId) {
      const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
      const verifyRes = await reqHttps({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, verifyData);

      const verifyJson = JSON.parse(verifyRes.body);
      const token = verifyJson.data?.accessToken;
      const user = verifyJson.data?.user;
      if (token) {
        console.log('Successfully obtained fresh token!');
        fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify({ accessToken: token, user, time: Date.now() }));
        return { token, user };
      }
    }
  } catch (err) {
    console.error('Failed to get token via API:', err);
  }

  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
    return { token: data.accessToken, user: data.user };
  }
  return null;
}

async function main() {
  console.log('=== TEST SUITE: CAREID ADMIN PORTAL – SYSTEM HEALTH & EXPORT (FIGMA 20:6239) ===\n');

  const auth = await getAdminToken();
  if (!auth || !auth.token) {
    console.error('Could not obtain token');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles'],
      status: 'ACTIVE'
    }));
  }, auth.token);

  // 2. Direct Navigation to System Health & Export
  console.log('Test 1: Navigate to /admin/reports/system-health ...');
  await page.goto('http://localhost:5173/admin/reports/system-health', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.system-health-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  console.log('Current URL:', page.url());

  // 3. Inspect Screen Elements
  console.log('\nTest 2: Validating Shared Layout & Header Elements...');
  const headerData = await page.evaluate(() => {
    const title = document.querySelector('.system-health-header-title')?.textContent?.trim();
    const searchPlaceholder = document.querySelector('.system-health-search-input')?.getAttribute('placeholder');
    const breadcrumb = document.querySelector('.system-health-breadcrumbs')?.textContent?.replace(/\s+/g, ' ')?.trim();
    const heading = document.querySelector('.system-health-title')?.textContent?.trim();
    const subtitle = document.querySelector('.system-health-subtitle')?.textContent?.trim();
    return { title, searchPlaceholder, breadcrumb, heading, subtitle };
  });

  console.log('- Header Title:', headerData.title);
  console.log('- Search Placeholder:', headerData.searchPlaceholder);
  console.log('- Breadcrumb:', headerData.breadcrumb);
  console.log('- Page Heading:', headerData.heading);
  console.log('- Subtitle:', headerData.subtitle);

  // 4. Inspect Infrastructure Health Section
  console.log('\nTest 3: Validating Infrastructure Health (Span 8)...');
  const infraData = await page.evaluate(() => {
    const card = document.querySelector('.system-health-card-infra');
    const title = card?.querySelector('.system-health-card-title')?.textContent?.trim();
    const lastUpdated = card?.querySelector('.system-health-last-updated')?.textContent?.trim();
    const subcards = Array.from(card?.querySelectorAll('.system-health-status-subcard') || []).map(sc => {
      const label = sc.querySelector('.system-health-subcard-label')?.textContent?.trim();
      const metric = sc.querySelector('.system-health-subcard-metric')?.textContent?.replace(/\s+/g, ' ')?.trim();
      const badge = sc.querySelector('.system-health-healthy-badge')?.textContent?.trim();
      return { label, metric, badge };
    });
    return { title, lastUpdated, subcards };
  });
  console.log('- Card Title:', infraData.title);
  console.log('- Last Updated:', infraData.lastUpdated);
  console.log('- Subcards:', JSON.stringify(infraData.subcards, null, 2));

  // 5. Inspect Workload & Storage Section
  console.log('\nTest 4: Validating Workload & Storage (Span 4)...');
  const workloadData = await page.evaluate(() => {
    const card = document.querySelector('.system-health-card-workload');
    const title = card?.querySelector('.system-health-card-title')?.textContent?.trim();
    const items = Array.from(card?.querySelectorAll('.system-health-workload-item') || []).map(it => {
      const label = it.querySelector('.system-health-workload-label')?.textContent?.trim();
      const val = it.querySelector('.system-health-workload-val')?.textContent?.replace(/\s+/g, ' ')?.trim();
      return { label, val };
    });
    return { title, items };
  });
  console.log('- Card Title:', workloadData.title);
  console.log('- Items:', JSON.stringify(workloadData.items, null, 2));

  // 6. Inspect Data Export Engine Section
  console.log('\nTest 5: Validating Data Export Engine & Interactivity (Span 12)...');
  const exportData = await page.evaluate(() => {
    const card = document.querySelector('.system-health-card-export');
    const title = card?.querySelector('.system-health-card-title')?.textContent?.trim();
    const desc = card?.querySelector('.system-health-card-export-desc')?.textContent?.trim();
    const formatBtns = Array.from(card?.querySelectorAll('.system-health-format-btn') || []).map(b => ({
      text: b.textContent?.replace(/\s+/g, ' ')?.trim(),
      isActive: b.classList.contains('active')
    }));
    const recentHeading = card?.querySelector('.system-health-empty-title')?.textContent?.trim();
    const recentDesc = card?.querySelector('.system-health-empty-desc')?.textContent?.replace(/\s+/g, ' ')?.trim();
    return { title, desc, formatBtns, recentHeading, recentDesc };
  });
  console.log('- Title:', exportData.title);
  console.log('- Description:', exportData.desc);
  console.log('- Formats:', JSON.stringify(exportData.formatBtns, null, 2));
  console.log('- Empty State Heading:', exportData.recentHeading);
  console.log('- Empty State Desc:', exportData.recentDesc);

  // 7. Test Format Selection & Form Submission
  console.log('\nTest 6: Testing Format Switching & Generate Export Form...');
  // Click Excel button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.system-health-format-btn'));
    const excel = btns.find(b => b.textContent.includes('Excel'));
    if (excel) excel.click();
  });
  await new Promise(r => setTimeout(r, 200));

  const excelActive = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.system-health-format-btn'));
    const excel = btns.find(b => b.textContent.includes('Excel'));
    return excel?.classList.contains('active');
  });
  console.log('- Excel button active state:', excelActive ? 'PASS' : 'FAIL');

  // Click Generate Export
  await page.evaluate(() => {
    const btn = document.querySelector('.system-health-export-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  const noticeText = await page.evaluate(() => {
    const banner = document.querySelector('.system-health-notice-banner');
    return banner?.textContent?.trim();
  });
  console.log('- Backend Dependency Notice Displayed:', noticeText);

  // Click Clear Filters
  await page.evaluate(() => {
    const btn = document.querySelector('.system-health-clear-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  const toastText = await page.evaluate(() => {
    const toast = document.querySelector('[role="status"]');
    return toast?.textContent?.trim();
  });
  console.log('- Clear Filters Toast:', toastText);

  // 8. Test Breadcrumb Navigation back to /admin/reports
  console.log('\nTest 7: Testing Breadcrumb Navigation...');
  await page.evaluate(() => {
    const crumb = document.querySelector('.system-health-breadcrumb-link');
    if (crumb) crumb.click();
  });
  await page.waitForSelector('.reports-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  console.log('- Current URL after clicking breadcrumb:', page.url());

  // Test Navigation back to /admin/reports/system-health via Action Button
  console.log('Testing Action 4 Button on Reports Dashboard...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.reports-action-card'));
    const target = btns.find(b => b.innerText.includes('System health'));
    if (target) target.click();
  });
  await page.waitForSelector('.system-health-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));
  console.log('- Current URL after clicking action card:', page.url());

  // 9. Viewport & Screenshot Testing
  console.log('\nTest 8: Capturing Screenshots Across Viewports...');
  const viewports = [
    { name: 'desktop_1920x1080', width: 1920, height: 1080, shot: 'system_health_export_1920x1080.png' },
    { name: 'desktop_1440x900', width: 1440, height: 900, shot: 'system_health_export_desktop.png' },
    { name: 'tablet_1024x768', width: 1024, height: 768, shot: 'system_health_export_tablet.png' },
    { name: 'mobile_375x667', width: 375, height: 667, shot: 'system_health_export_mobile.png' },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/reports/system-health', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.system-health-canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    const fitData = await page.evaluate(() => {
      const windowWidth = window.innerWidth;
      const canvas = document.querySelector('.system-health-canvas');
      const bento = document.querySelector('.system-health-bento-grid');
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const bentoRect = bento ? bento.getBoundingClientRect() : null;
      const hasHorizontalScroll = document.documentElement.scrollWidth > windowWidth || (canvas && canvas.scrollWidth > canvas.clientWidth);
      return {
        windowWidth,
        canvasWidth: rect ? Math.round(rect.width) : 0,
        bentoWidth: bentoRect ? Math.round(bentoRect.width) : 0,
        hasHorizontalScroll
      };
    });

    const shotPath = path.join(ARTIFACT_DIR, vp.shot);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`- ${vp.name}: Canvas W=${fitData.canvasWidth}px, Bento W=${fitData.bentoWidth}px, Horiz Scroll=${fitData.hasHorizontalScroll ? 'FAIL' : 'PASS'}, Saved: ${vp.shot}`);
  }

  await browser.close();
  console.log('\n=== ALL SYSTEM HEALTH & EXPORT VERIFICATIONS COMPLETE ===');
}

main().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
