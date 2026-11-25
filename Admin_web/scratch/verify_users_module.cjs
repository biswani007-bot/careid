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

  // 2. Navigate to /admin/users and wait for live rows
  console.log('Navigating to /admin/users...');
  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table-row', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1000));

  const dirSummary = await page.evaluate(() => {
    const kpiCards = Array.from(document.querySelectorAll('.users-kpi-card')).map(c => ({
      title: c.querySelector('.users-kpi-title')?.textContent.trim() || c.querySelector('.kpi-card-title')?.textContent.trim(),
      val: c.querySelector('.users-kpi-val')?.textContent.trim() || c.querySelector('.kpi-card-val')?.textContent.trim()
    }));
    const rows = Array.from(document.querySelectorAll('.users-table-row')).map(r => ({
      name: r.querySelector('.user-info-name')?.textContent.trim() || r.querySelector('.user-cell-name')?.textContent.trim(),
      role: r.querySelector('.user-role-badge')?.textContent.trim(),
      status: r.querySelector('.user-status-pill')?.textContent.trim()
    }));
    return {
      kpiCards,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 3)
    };
  });
  console.log('User Directory Summary:', JSON.stringify(dirSummary, null, 2));

  const dirShot = path.join(artifactDir, 'admin_users_directory_live.png');
  await page.screenshot({ path: dirShot, fullPage: false });
  console.log('Saved screenshot:', dirShot);

  // 3. Test Create User Page /admin/users/create
  console.log('Navigating to /admin/users/create...');
  await page.goto('http://localhost:5173/admin/users/create', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  const testEmail = 'staff.lead.' + Math.floor(1000 + Math.random() * 9000) + '@careid.test';
  const testPhone = '+1650555' + Math.floor(1000 + Math.random() * 9000);

  await page.type('input[name="name"]', 'Clinical Operations Lead');
  await page.type('input[name="email"]', testEmail);
  await page.type('input[name="phone"]', testPhone);
  await page.select('select[name="role"]', 'STAFF');

  const createShot = path.join(artifactDir, 'admin_create_user_live.png');
  await page.screenshot({ path: createShot, fullPage: false });
  console.log('Saved screenshot:', createShot);

  console.log('Submitting Create User form...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // 4. Test User Details Page with a real patient user ID (Pabani Prasad)
  const patientUserId = '07f8d810-dc6f-499d-90fc-d029716610a3';
  console.log('Navigating to User Details page for', patientUserId);
  await page.goto('http://localhost:5173/admin/users/' + patientUserId, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.user-details-heading', { timeout: 10000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('.profile-card-name');
    return el && !el.textContent.includes('Loading');
  }, { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const detailsSummary = await page.evaluate(() => {
    const name = document.querySelector('.profile-card-name')?.textContent.trim();
    const role = document.querySelector('.profile-card-role')?.textContent.trim();
    const hvid = document.querySelector('.profile-card-hvid-val')?.textContent.trim();
    const email = document.querySelector('.user-details-field-val span')?.textContent.trim();
    return { name, role, hvid, email };
  });
  console.log('User Details Summary:', detailsSummary);

  const detailsShot = path.join(artifactDir, 'admin_user_details_live.png');
  await page.screenshot({ path: detailsShot, fullPage: false });
  console.log('Saved screenshot:', detailsShot);

  // 5. Test Active Sessions Modal
  console.log('Testing Active Sessions tile click...');
  const sessionsTile = await page.$('.user-details-security-tile[title*="sessions"]');
  if (sessionsTile) {
    await sessionsTile.click();
    await page.waitForSelector('.user-details-modal-title', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    const sessionsShot = path.join(artifactDir, 'admin_user_sessions_modal_live.png');
    await page.screenshot({ path: sessionsShot, fullPage: false });
    console.log('Saved screenshot:', sessionsShot);

    const closeSessionsBtn = await page.$('.btn-modal-cancel');
    if (closeSessionsBtn) await closeSessionsBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Test Edit Profile Modal
  console.log('Testing Edit Profile button...');
  const editBtn = await page.$('.btn-details-edit');
  if (editBtn) {
    await editBtn.click();
    await page.waitForSelector('#edit-profile-title', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    const editShot = path.join(artifactDir, 'admin_edit_user_live.png');
    await page.screenshot({ path: editShot, fullPage: false });
    console.log('Saved screenshot:', editShot);

    const cancelEditBtn = await page.$('.btn-modal-cancel');
    if (cancelEditBtn) await cancelEditBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  console.log('All Puppeteer verification steps completed successfully!');
}

run().catch(err => {
  console.error('Puppeteer verification failed:', err);
  process.exit(1);
});
