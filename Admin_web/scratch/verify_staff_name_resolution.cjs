const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const artifactDir = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

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

async function getFreshToken() {
  console.log('Acquiring fresh Super Admin token...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);
  const challengeId = otpRes.body.data.challengeId;

  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const authData = verifyRes.body.data;
  const tokenPayload = {
    token: authData.accessToken,
    accessToken: authData.accessToken,
    refreshToken: authData.refreshToken,
    user: {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    }
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  console.log('Acquired fresh token successfully!');
  return authData.accessToken;
}

async function run() {
  const token = await getFreshToken();

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // 1. Setup authenticated session
  console.log('Setting auth session in localStorage...');
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+16505550001'
    }));
  }, token);

  // 2. Navigate to /admin/users
  console.log('Navigating to /admin/users...');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));

  // Inspect all rows in the directory
  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(row => {
      const name = row.querySelector('.user-name')?.textContent.trim();
      const hvid = row.querySelector('.user-hvid')?.textContent.trim();
      const role = row.querySelector('.user-role-badge')?.textContent.trim();
      const email = row.querySelector('.user-email')?.textContent.trim();
      const phone = row.querySelector('.user-phone')?.textContent.trim();
      const status = row.querySelector('.user-status-pill')?.textContent.trim();
      return { name, hvid, role, email, phone, status };
    });
  });

  console.log('\n--- Live Directory Rows on Page 1 ---');
  console.dir(rows, { depth: null });

  // Check if Paban is on Page 1 or search for Paban
  console.log('\nSearching for "paban"...');
  const searchInput = await page.$('.users-search-input');
  await searchInput.click();
  await searchInput.type('paban');
  await new Promise(r => setTimeout(r, 1200));

  const searchResults = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(row => {
      const name = row.querySelector('.user-name')?.textContent.trim();
      const hvid = row.querySelector('.user-hvid')?.textContent.trim();
      const role = row.querySelector('.user-role-badge')?.textContent.trim();
      const email = row.querySelector('.user-email')?.textContent.trim();
      const phone = row.querySelector('.user-phone')?.textContent.trim();
      return { name, hvid, role, email, phone };
    });
  });

  console.log('\n--- Search Results for "paban" ---');
  console.dir(searchResults, { depth: null });

  // Take screenshot of resolved Staff user in User Directory
  const dirScreenshotPath = path.join(artifactDir, 'staff_user_directory_resolved.png');
  await page.screenshot({ path: dirScreenshotPath, fullPage: false });
  console.log('Saved directory screenshot to:', dirScreenshotPath);

  // Clear search and test Staff filter chip
  console.log('\nTesting Staff filter chip...');
  await page.evaluate(() => {
    const input = document.querySelector('.users-search-input');
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Click 'Staff' filter chip
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.users-filter-chip'));
    const staffChip = chips.find(c => c.textContent.trim() === 'Staff');
    if (staffChip) staffChip.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  const staffChipRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.users-table-row')).map(row => {
      const name = row.querySelector('.user-name')?.textContent.trim();
      const hvid = row.querySelector('.user-hvid')?.textContent.trim();
      const role = row.querySelector('.user-role-badge')?.textContent.trim();
      const email = row.querySelector('.user-email')?.textContent.trim();
      const phone = row.querySelector('.user-phone')?.textContent.trim();
      return { name, hvid, role, email, phone };
    });
  });
  console.log('\n--- Staff Filter Chip Rows ---');
  console.dir(staffChipRows, { depth: null });

  const chipScreenshotPath = path.join(artifactDir, 'staff_filter_chip_resolved.png');
  await page.screenshot({ path: chipScreenshotPath, fullPage: false });
  console.log('Saved staff chip screenshot to:', chipScreenshotPath);

  // 3. Navigate to User Details for Paban (User ID: 73ad9c58-e1fa-41a7-89dd-4f6579940b28)
  console.log('\nNavigating to Paban User Details (/admin/users/73ad9c58-e1fa-41a7-89dd-4f6579940b28)...');
  await page.goto('http://localhost:5173/admin/users/73ad9c58-e1fa-41a7-89dd-4f6579940b28', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.user-details-profile-card', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));

  const userDetailsInfo = await page.evaluate(() => {
    const name = document.querySelector('.profile-card-name')?.textContent.trim();
    const role = document.querySelector('.profile-card-role')?.textContent.trim();
    const status = document.querySelector('.profile-card-status-badge')?.textContent.trim();
    const hvid = document.querySelector('.profile-card-hvid-val')?.textContent.trim();

    // Account info fields
    const fields = Array.from(document.querySelectorAll('.user-details-field-item')).map(item => {
      const label = item.querySelector('.user-details-field-label')?.textContent.trim();
      const val = item.querySelector('.user-details-field-val')?.textContent.trim();
      const extra = item.textContent.trim();
      return { label, val, extra };
    });

    return { name, role, status, hvid, fields };
  });

  console.log('\n--- Paban User Details Extracted ---');
  console.dir(userDetailsInfo, { depth: null });

  const detailsScreenshotPath = path.join(artifactDir, 'staff_user_details_resolved.png');
  await page.screenshot({ path: detailsScreenshotPath, fullPage: false });
  console.log('Saved details screenshot to:', detailsScreenshotPath);

  await browser.close();
  console.log('\nVerification run finished successfully!');
}

run().catch(err => {
  console.error('Error during verification run:', err);
  process.exit(1);
});

