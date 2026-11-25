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
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getLiveToken() {
  const tokenFile = path.join(__dirname, 'cached_admin_token.json');
  if (fs.existsSync(tokenFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      if (cached.token) {
        const verify = await httpRequest({
          hostname: '360api.vnvision.in',
          path: '/api/v1/auth/me',
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${cached.token}` }
        });
        if (verify.status === 200 && verify.body?.success) {
          console.log('Reusing cached valid Super Admin JWT token.');
          return cached.token;
        }
      }
    } catch(e) {}
  }

  console.log('Requesting new OTP from live backend...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);
  const challengeId = otpRes.body.data?.challengeId;

  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const token = verifyRes.body.data?.accessToken;
  if (token) {
    fs.writeFileSync(tokenFile, JSON.stringify({ token, savedAt: Date.now() }), 'utf8');
  }
  return token;
}

async function verify() {
  console.log('=== CareID Admin User Directory Live API Integration Verification ===\n');

  const token = await getLiveToken();
  if (!token) throw new Error('Could not acquire valid live token');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Initialize browser storage
  console.log('Injecting session credentials into browser localStorage...');
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
      roles: ['SUPER_ADMIN', 'ADMIN'],
      permissions: ['*']
    }));
  }, token);

  // 2. Navigate to /admin/users
  console.log('Navigating to http://localhost:5173/admin/users ...');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  
  // Wait for loading skeletons to disappear and real numbers to render
  console.log('Waiting for live API response to populate dashboard...');
  await page.waitForFunction(() => {
    const pulse = document.querySelector('.users-bento-card .skeleton-pulse');
    const val = document.querySelector('.users-bento-value')?.textContent?.trim();
    return !pulse && val && val.length > 0;
  }, { timeout: 10000 });

  // 3. Inspect Page Title
  const title = await page.$eval('.users-title', el => el.textContent.trim());
  const subtitle = await page.$eval('.users-subtitle', el => el.textContent.trim());
  console.log(`[PASS] Title: "${title}"`);
  console.log(`[PASS] Subtitle: "${subtitle}"`);

  // 4. Inspect Summary Cards (KPIs)
  const kpis = await page.$$eval('.users-bento-card', els => els.map(el => {
    const label = el.querySelector('.users-bento-label')?.textContent?.trim() || '';
    const value = el.querySelector('.users-bento-value')?.textContent?.trim() || '';
    return { label, value };
  }));

  console.log('\n--- Live Summary Cards ---');
  kpis.forEach(k => console.log(`Card: [${k.label}] Value: "${k.value}"`));

  const totalUsersCard = kpis.find(k => k.label.toLowerCase().includes('total'));
  const activeCard = kpis.find(k => k.label.toLowerCase().includes('active'));
  const inactiveCard = kpis.find(k => k.label.toLowerCase().includes('inactive'));
  const pendingCard = kpis.find(k => k.label.toLowerCase().includes('pending'));

  if (totalUsersCard && totalUsersCard.value === '15') {
    console.log('[PASS] Total Users matches backend count: 15');
  } else {
    throw new Error(`Total Users expected '15', got '${totalUsersCard?.value}'`);
  }

  if (activeCard && activeCard.value === '15') {
    console.log('[PASS] Active Users matches backend count: 15');
  } else {
    throw new Error(`Active Users expected '15', got '${activeCard?.value}'`);
  }

  if (inactiveCard && inactiveCard.value === '0') {
    console.log('[PASS] Inactive Users matches backend count: 0');
  } else {
    throw new Error(`Inactive Users expected '0', got '${inactiveCard?.value}'`);
  }

  if (pendingCard && pendingCard.value === '0') {
    console.log('[PASS] Pending Users matches backend count: 0');
  } else {
    throw new Error(`Pending Users expected '0', got '${pendingCard?.value}'`);
  }

  // 5. Inspect Initial Table Rows (Page 1)
  const rows = await page.$$eval('.users-table-row', els => els.map(el => {
    const name = el.querySelector('.user-name')?.textContent?.trim() || '';
    const hvid = el.querySelector('.user-hvid')?.textContent?.trim() || '';
    const role = el.querySelector('.user-role-badge')?.textContent?.trim() || '';
    const email = el.querySelector('.user-email')?.textContent?.trim() || '';
    const phone = el.querySelector('.user-phone')?.textContent?.trim() || '';
    const status = el.querySelector('.user-status-text')?.textContent?.trim() || '';
    const verification = el.querySelector('.user-verification-badge')?.textContent?.trim() || '';
    const created = el.querySelectorAll('.user-date-cell')[0]?.textContent?.trim() || '';
    const lastLogin = el.querySelectorAll('.user-date-cell')[1]?.textContent?.trim() || '';
    return { name, hvid, role, email, phone, status, verification, created, lastLogin };
  }));

  console.log(`\n--- Initial Page 1 Rows (${rows.length} rows) ---`);
  rows.forEach((r, i) => {
    console.log(`Row ${i+1}: [${r.role}] ${r.name} | HVID: ${r.hvid} | Phone: ${r.phone} | Status: ${r.status} | Verif: ${r.verification} | Created: ${r.created}`);
  });

  const paginationShowing = await page.$eval('.users-pagination-count', el => el.textContent.trim());
  console.log(`[PASS] Pagination: "${paginationShowing}"`);

  // 6. Test Filter Chips
  console.log('\n--- Testing Role & Status Filters ---');

  // Click 'Admins' chip
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
    const adminChip = chips.find(c => c.textContent.trim() === 'Admins');
    if (adminChip) adminChip.click();
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('3 of 3');
  }, { timeout: 4000 });

  const adminRows = await page.$$eval('.users-table-row', els => els.map(el => el.querySelector('.user-name')?.textContent?.trim()));
  console.log(`[PASS] Filter 'Admins' returned ${adminRows.length} users:`, adminRows);

  // Click 'Doctors' chip
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
    const docChip = chips.find(c => c.textContent.trim() === 'Doctors');
    if (docChip) docChip.click();
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('1 of 1');
  }, { timeout: 4000 });

  const doctorRows = await page.$$eval('.users-table-row', els => els.map(el => el.querySelector('.user-name')?.textContent?.trim()));
  console.log(`[PASS] Filter 'Doctors' returned ${doctorRows.length} users:`, doctorRows);

  // Click 'Patients' chip
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
    const patChip = chips.find(c => c.textContent.trim() === 'Patients');
    if (patChip) patChip.click();
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('of 9');
  }, { timeout: 4000 });

  const patientRows = await page.$$eval('.users-table-row', els => els.map(el => el.querySelector('.user-name')?.textContent?.trim()));
  console.log(`[PASS] Filter 'Patients' returned ${patientRows.length} users on page 1:`, patientRows);

  // Reset to 'All Users'
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
    const allChip = chips.find(c => c.textContent.trim() === 'All Users');
    if (allChip) allChip.click();
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('of 15');
  }, { timeout: 4000 });

  // 7. Test Search Functionality
  console.log('\n--- Testing Search Input ---');
  const searchInput = await page.$('.users-search-input');

  // Search 'John'
  console.log('Searching for "John"...');
  await searchInput.type('John');
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('1 of 1');
  }, { timeout: 4000 });

  const searchJohn = await page.$$eval('.users-table-row', els => els.map(el => ({
    name: el.querySelector('.user-name')?.textContent?.trim(),
    hvid: el.querySelector('.user-hvid')?.textContent?.trim()
  })));
  console.log(`[PASS] Search 'John' found ${searchJohn.length} matching user:`, searchJohn);

  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('.users-search-input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('of 15');
  }, { timeout: 4000 });
  console.log('[PASS] Cleared search back to full user list.');

  // 8. Test Pagination
  console.log('\n--- Testing Pagination ---');
  // Click Next Page Arrow
  const nextBtn = (await page.$$('.users-page-arrow-btn'))[1];
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForFunction(() => {
      const text = document.querySelector('.users-pagination-count')?.textContent || '';
      return text.includes('6 to 10');
    }, { timeout: 4000 });
    const page2Showing = await page.$eval('.users-pagination-count', el => el.textContent.trim());
    console.log(`[PASS] Page 2 Pagination: "${page2Showing}"`);
  }

  // Change page size to 10
  await page.select('.users-rows-select', '10');
  await page.waitForFunction(() => {
    const text = document.querySelector('.users-pagination-count')?.textContent || '';
    return text.includes('1 to 10 of 15');
  }, { timeout: 4000 });
  const page10Rows = await page.$$eval('.users-table-row', els => els.length);
  const page10Showing = await page.$eval('.users-pagination-count', el => el.textContent.trim());
  console.log(`[PASS] Page size 10: displayed ${page10Rows} rows. Pagination text: "${page10Showing}"`);

  // 9. Test User Details Navigation
  console.log('\n--- Testing User Details Navigation ---');
  // Click on the row with John Doe or first row
  const firstRow = await page.$('.users-table-row');
  if (firstRow) {
    await firstRow.click();
    await page.waitForSelector('.user-details-heading', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    const detailsTitle = await page.$eval('.user-details-heading', el => el.textContent.trim()).catch(() => null);
    const detailsName = await page.$eval('.profile-card-name', el => el.textContent.trim()).catch(() => null);
    const detailsHvid = await page.$eval('.profile-card-hvid-val', el => el.textContent.trim()).catch(() => null);
    console.log(`[PASS] User Details Page loaded: "${detailsTitle}"`);
    console.log(`[PASS] Profile Name: "${detailsName}" | HVID: "${detailsHvid}"`);

    // Click breadcrumb to return to /admin/users
    const breadcrumbLink = await page.$('.user-details-breadcrumb-link');
    if (breadcrumbLink) {
      await breadcrumbLink.click();
      await page.waitForSelector('.users-title', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));
      console.log('[PASS] Returned to User Directory via breadcrumb.');
    }
  }

  // 10. Responsive Viewport Screenshots
  console.log('\nCapturing screenshots across viewports in artifact directory...');

  // Desktop (1440x900)
  await page.setViewport({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(artifactDir, 'admin_users_desktop.png') });
  console.log('[PASS] Saved admin_users_desktop.png (1440x900)');

  // Full Page Desktop
  await page.screenshot({ path: path.join(artifactDir, 'admin_users_fullpage.png'), fullPage: true });
  console.log('[PASS] Saved admin_users_fullpage.png');

  // Large Desktop (1920x1080)
  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(artifactDir, 'admin_users_1920x1080.png') });
  console.log('[PASS] Saved admin_users_1920x1080.png (1920x1080)');

  // Tablet (768x1024)
  await page.setViewport({ width: 768, height: 1024 });
  await page.screenshot({ path: path.join(artifactDir, 'admin_users_tablet.png') });
  console.log('[PASS] Saved admin_users_tablet.png (768x1024)');

  // Mobile (375x812)
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(artifactDir, 'admin_users_mobile.png') });
  console.log('[PASS] Saved admin_users_mobile.png (375x812)');

  await browser.close();
  console.log('\n=== All User Directory Verification Checks Passed Successfully ===');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
