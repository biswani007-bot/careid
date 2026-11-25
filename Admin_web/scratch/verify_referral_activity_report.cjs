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
  console.log('=== TEST SUITE: CAREID ADMIN PORTAL – REFERRAL ACTIVITY REPORT (FIGMA 20:6510) ===\n');

  const auth = await getAdminToken();
  if (!auth || !auth.token) {
    console.error('Could not authenticate');
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

  // 2. Direct Navigation to Referral Activity Report
  console.log('Test 1: Navigate to /admin/reports/referral-activity ...');
  await page.goto('http://localhost:5173/admin/reports/referral-activity', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-activity-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  console.log('Current URL:', page.url());

  // 3. Inspect Shared Layout & Header
  console.log('\nTest 2: Validating Shared Layout & Top Navigation Bar...');
  const headerData = await page.evaluate(() => {
    const headerTitle = document.querySelector('.referral-activity-header-title')?.textContent?.trim();
    const searchPlaceholder = document.querySelector('.referral-activity-search-input')?.getAttribute('placeholder');
    const pageTitle = document.querySelector('.referral-activity-title')?.textContent?.trim();
    const pageSubtitle = document.querySelector('.referral-activity-subtitle')?.textContent?.trim();
    const dateBtnText = document.querySelector('.referral-activity-date-btn')?.textContent?.replace(/\s+/g, ' ')?.trim();
    const exportBtnText = document.querySelector('.referral-activity-export-btn')?.textContent?.trim();
    const activeNav = document.querySelector('.sidebar-nav-item.active, [aria-current="page"]')?.textContent?.trim();
    return { headerTitle, searchPlaceholder, pageTitle, pageSubtitle, dateBtnText, exportBtnText, activeNav };
  });

  console.log('- Header Title:', headerData.headerTitle);
  console.log('- Search Placeholder:', headerData.searchPlaceholder);
  console.log('- Page Title:', headerData.pageTitle);
  console.log('- Page Subtitle:', headerData.pageSubtitle);
  console.log('- Date Selector:', headerData.dateBtnText);
  console.log('- Export Button:', headerData.exportBtnText);
  console.log('- Active Nav:', headerData.activeNav);

  // 4. Inspect Top Metrics Bento Grid
  console.log('\nTest 3: Validating Top KPI Metrics Section...');
  const kpiData = await page.evaluate(() => {
    const volTitle = document.querySelector('.referral-activity-volume-title')?.textContent?.trim();
    const volNum = document.querySelector('.referral-activity-volume-number')?.textContent?.trim();
    const volSub = document.querySelector('.referral-activity-volume-subtext')?.textContent?.trim();
    const volTrend = document.querySelector('.referral-activity-volume-badge')?.textContent?.trim();
    const sparkBars = document.querySelectorAll('.referral-activity-spark-bar').length;

    const cards = Array.from(document.querySelectorAll('.referral-activity-kpi-card')).map(c => {
      const label = c.querySelector('.referral-activity-kpi-label')?.textContent?.trim();
      const val = c.querySelector('.referral-activity-kpi-val')?.textContent?.replace(/\s+/g, ' ')?.trim();
      const badge = c.querySelector('[class*="referral-activity-badge"]')?.textContent?.trim();
      return { label, val, badge };
    });

    return { volTitle, volNum, volSub, volTrend, sparkBars, cards };
  });

  console.log('- Volume Card:', `${kpiData.volTitle} | ${kpiData.volNum} ${kpiData.volSub} (${kpiData.volTrend}) | Sparkline Bars: ${kpiData.sparkBars}`);
  console.log('- Secondary KPIs:', JSON.stringify(kpiData.cards, null, 2));

  // 5. Inspect Pipeline Status
  console.log('\nTest 4: Validating Pipeline Status Section (Span 4)...');
  const pipelineData = await page.evaluate(() => {
    const title = document.querySelector('.referral-activity-pipeline-col .referral-activity-section-title')?.textContent?.trim();
    const items = Array.from(document.querySelectorAll('.referral-activity-status-card')).map(card => {
      const name = card.querySelector('.referral-activity-status-name')?.textContent?.trim();
      const num = card.querySelector('.referral-activity-status-num')?.textContent?.trim();
      const pct = card.querySelector('.referral-activity-percent-badge')?.textContent?.trim();
      return { name, num, pct };
    });
    return { title, items };
  });

  console.log('- Section Title:', pipelineData.title);
  console.log('- Pipeline Items:', JSON.stringify(pipelineData.items, null, 2));

  // 6. Inspect Hospital Distribution
  console.log('\nTest 5: Validating Hospital Distribution Section (Span 4)...');
  const hospitalData = await page.evaluate(() => {
    const title = document.querySelector('.referral-activity-hospital-col .referral-activity-section-title')?.textContent?.trim();
    const labels = Array.from(document.querySelectorAll('.referral-activity-x-label')).map(l => l.textContent?.trim());
    const bars = Array.from(document.querySelectorAll('.referral-activity-bar-fill')).map(b => {
      const tooltip = b.querySelector('.referral-activity-bar-tooltip')?.textContent?.trim();
      const height = b.style.height;
      return { tooltip, height };
    });
    return { title, labels, bars };
  });

  console.log('- Section Title:', hospitalData.title);
  console.log('- Hospital Labels:', hospitalData.labels.join(', '));
  console.log('- Bars & Tooltips:', JSON.stringify(hospitalData.bars, null, 2));

  // 7. Inspect Top Departments
  console.log('\nTest 6: Validating Top Departments Section (Span 4)...');
  const deptData = await page.evaluate(() => {
    const title = document.querySelector('.referral-activity-dept-col .referral-activity-section-title')?.textContent?.trim();
    const viewAll = document.querySelector('.referral-activity-view-all')?.textContent?.trim();
    const depts = Array.from(document.querySelectorAll('.referral-activity-dept-row')).map(row => {
      const name = row.querySelector('.referral-activity-dept-name')?.textContent?.trim();
      const count = row.querySelector('.referral-activity-dept-count')?.textContent?.trim();
      const fill = row.querySelector('.referral-activity-dept-bar-fill')?.style.width;
      return { name, count, fill };
    });
    return { title, viewAll, depts };
  });

  console.log('- Section Title:', deptData.title);
  console.log('- View All Link:', deptData.viewAll);
  console.log('- Departments:', JSON.stringify(deptData.depts, null, 2));

  // 8. Test Navigation from Reports Dashboard
  console.log('\nTest 7: Testing Navigation from Reports Dashboard (Action 3)...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.reports-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.reports-action-card'));
    const refBtn = btns.find(b => b.innerText.includes('Referral Activity'));
    if (refBtn) refBtn.click();
  });
  await page.waitForSelector('.referral-activity-canvas', { timeout: 10000 });
  console.log('- Navigated URL after clicking action card:', page.url());

  // 9. Viewport & Screenshot Testing
  console.log('\nTest 8: Capturing Screenshots Across Viewports...');
  const viewports = [
    { name: 'desktop_1920x1080', width: 1920, height: 1080, shot: 'referral_activity_1920x1080.png' },
    { name: 'desktop_1440x900', width: 1440, height: 900, shot: 'referral_activity_desktop.png' },
    { name: 'tablet_1024x768', width: 1024, height: 768, shot: 'referral_activity_tablet.png' },
    { name: 'mobile_375x667', width: 375, height: 667, shot: 'referral_activity_mobile.png' },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:5173/admin/reports/referral-activity', { waitUntil: 'networkidle2' });
    await page.waitForSelector('.referral-activity-canvas', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 600));

    const fitData = await page.evaluate(() => {
      const windowWidth = window.innerWidth;
      const canvas = document.querySelector('.referral-activity-canvas');
      const topGrid = document.querySelector('.referral-activity-top-grid');
      const bottomGrid = document.querySelector('.referral-activity-bottom-grid');
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const topRect = topGrid ? topGrid.getBoundingClientRect() : null;
      const bottomRect = bottomGrid ? bottomGrid.getBoundingClientRect() : null;
      const hasHorizontalScroll = document.documentElement.scrollWidth > windowWidth || (canvas && canvas.scrollWidth > canvas.clientWidth);
      return {
        windowWidth,
        canvasWidth: rect ? Math.round(rect.width) : 0,
        topGridWidth: topRect ? Math.round(topRect.width) : 0,
        bottomGridWidth: bottomRect ? Math.round(bottomRect.width) : 0,
        hasHorizontalScroll
      };
    });

    const shotPath = path.join(ARTIFACT_DIR, vp.shot);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`- ${vp.name}: Canvas W=${fitData.canvasWidth}px, TopGrid W=${fitData.topGridWidth}px, BottomGrid W=${fitData.bottomGridWidth}px, Horiz Scroll=${fitData.hasHorizontalScroll ? 'FAIL' : 'PASS'}, Saved: ${vp.shot}`);
  }

  await browser.close();
  console.log('\n=== ALL REFERRAL ACTIVITY REPORT VERIFICATIONS COMPLETE ===');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

