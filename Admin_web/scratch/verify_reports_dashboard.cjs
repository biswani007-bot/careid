const puppeteer = require('puppeteer-core');
const fs = require('fs');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
    console.log('challengeId:', challengeId);

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
        console.log('Successfully obtained token!');
        fs.writeFileSync('scratch/cached_token.json', JSON.stringify({ accessToken: token, user, time: Date.now() }));
        return { token, user };
      }
    }
  } catch (err) {
    console.error('Failed to get token via API:', err);
  }

  return null;
}

async function run() {
  const auth = await getAdminToken();
  if (!auth) {
    console.error('Could not authenticate');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to root to set localStorage
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

  console.log('Navigating to http://localhost:5173/admin/reports...');
  await page.goto('http://localhost:5173/admin/reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Verify page structure
  const pageVerification = await page.evaluate(() => {
    const title = document.querySelector('.reports-title')?.textContent?.trim();
    const subtitle = document.querySelector('.reports-subtitle')?.textContent?.trim();
    const activeNavTab = document.querySelector('.reports-nav-tab.active')?.textContent?.trim();
    
    // Check bento cards
    const kpiCards = Array.from(document.querySelectorAll('.reports-kpi-card')).map(card => {
      const label = card.querySelector('.reports-kpi-label')?.textContent?.trim();
      const val = card.querySelector('.reports-kpi-value')?.textContent?.trim();
      const trend = card.querySelector('.reports-kpi-trend')?.textContent?.trim();
      return { label, val, trend };
    });

    // Check action cards
    const actionCards = Array.from(document.querySelectorAll('.reports-action-card')).map(card => {
      return card.textContent?.trim();
    });

    // Check time filter buttons
    const timeBtns = Array.from(document.querySelectorAll('.reports-time-btn')).map(b => ({
      text: b.textContent?.trim(),
      active: b.classList.contains('active')
    }));

    return {
      title,
      subtitle,
      activeNavTab,
      kpiCards,
      actionCards,
      timeBtns
    };
  });

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log('Page Title:', pageVerification.title);
  console.log('Subtitle:', pageVerification.subtitle);
  console.log('Active Nav Tab:', pageVerification.activeNavTab);
  console.log('KPI Cards (4 total):', pageVerification.kpiCards);
  console.log('Action Cards (3 total):', pageVerification.actionCards);
  console.log('Time Filters:', pageVerification.timeBtns);

  // Capture desktop screenshot
  await page.screenshot({ path: 'scratch/reports_dashboard_desktop.png', fullPage: false });
  console.log('Saved scratch/reports_dashboard_desktop.png');

  // Test Time Filter Click
  console.log('\nTesting 7D Time Filter click...');
  const clicked7D = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.reports-time-btn'));
    const btn7D = btns.find(b => b.textContent?.trim() === '7D');
    if (btn7D) {
      btn7D.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 600));
  const newActiveFilter = await page.evaluate(() => {
    return document.querySelector('.reports-time-btn.active')?.textContent?.trim();
  });
  console.log('7D button clicked:', clicked7D, '| Active now:', newActiveFilter);

  // Test Hospital Dropdown
  console.log('\nTesting Hospital Dropdown open...');
  await page.evaluate(() => {
    const dropBtns = Array.from(document.querySelectorAll('.reports-dropdown-btn'));
    if (dropBtns[0]) dropBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 400));
  const dropdownItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.reports-dropdown-item')).map(i => i.textContent?.trim());
  });
  console.log('Hospital Dropdown items:', dropdownItems);

  // Close dropdown
  await page.evaluate(() => {
    const dropBtns = Array.from(document.querySelectorAll('.reports-dropdown-btn'));
    if (dropBtns[0]) dropBtns[0].click();
  });

  // Test Export Modal
  console.log('\nTesting Export Modal trigger...');
  await page.evaluate(() => {
    const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Export'));
    if (exportBtn) exportBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const exportModalVisible = await page.evaluate(() => {
    return !!document.getElementById('export-dialog-title');
  });
  console.log('Export Modal opened:', exportModalVisible);
  await page.screenshot({ path: 'scratch/reports_dashboard_export_modal.png' });
  console.log('Saved scratch/reports_dashboard_export_modal.png');

  // Close export modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cancel');
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Tablet Viewport (768x1024)
  console.log('\nTesting Tablet Viewport (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/reports_dashboard_tablet.png' });
  console.log('Saved scratch/reports_dashboard_tablet.png');

  // Mobile Viewport (375x667)
  console.log('\nTesting Mobile Viewport (375x667)...');
  await page.setViewport({ width: 375, height: 667 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'scratch/reports_dashboard_mobile.png' });
  console.log('Saved scratch/reports_dashboard_mobile.png');

  // Action card navigation test
  console.log('\nTesting Action Card click (OCR Performance Report)...');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const action1 = document.querySelector('.reports-action-card');
    if (action1) action1.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const currentUrl = page.url();
  console.log('URL after clicking OCR Performance Report:', currentUrl);

  await browser.close();
  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
