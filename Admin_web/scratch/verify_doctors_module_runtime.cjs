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
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      if (cached.accessToken) {
        console.log('Using cached Super Admin token...');
        return cached.accessToken;
      }
    } catch {}
  }
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

  // 2. Navigate to Doctor Directory (/admin/doctors)
  console.log('\n--- 1. Navigating to Doctor Directory (/admin/doctors) ---');
  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.doctors-doctor-name', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));

  // Extract KPI card data
  const kpiData = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.doctors-kpi-card')).map(card => ({
      title: card.querySelector('.doctors-kpi-label')?.textContent.trim(),
      val: card.querySelector('.doctors-kpi-value')?.textContent.trim()
    }));
  });
  console.log('Doctor Directory KPIs:', JSON.stringify(kpiData, null, 2));

  // Extract table rows
  const doctorRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('tbody tr.cursor-pointer')).map(row => {
      const name = row.querySelector('.doctors-doctor-name')?.textContent.trim();
      const hvId = row.querySelector('.doctors-doctor-hvid')?.textContent.trim();
      const license = row.querySelector('.doctors-doctor-license')?.textContent.trim();
      const specialty = row.querySelector('.doctors-doctor-specialty')?.textContent.trim();
      const status = row.querySelector('.doctors-status-pill')?.textContent.trim();
      return { name, hvId, license, specialty, status };
    });
  });
  console.log(`Live Doctors in Directory (${doctorRows.length} rows):`, JSON.stringify(doctorRows, null, 2));

  const dirScreenshotPath = path.join(artifactDir, 'doctors_directory_live.png');
  await page.screenshot({ path: dirScreenshotPath, fullPage: false });
  console.log('Saved directory screenshot to:', dirScreenshotPath);

  // 3. Test Search & Filter
  console.log('\n--- 2. Testing Search and Filter ---');
  const searchInput = await page.$('.patients-header-search-input');
  if (searchInput) {
    await searchInput.click();
    await searchInput.type('Swagat');
    await new Promise(r => setTimeout(r, 1200));

    const filteredRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('tbody tr.cursor-pointer')).map(row => ({
        name: row.querySelector('.doctors-doctor-name')?.textContent.trim(),
        specialty: row.querySelector('.doctors-doctor-specialty')?.textContent.trim(),
        status: row.querySelector('.doctors-status-pill')?.textContent.trim()
      }));
    });
    console.log('Search "Swagat" results:', JSON.stringify(filteredRows, null, 2));

    const searchScreenshotPath = path.join(artifactDir, 'doctors_search_and_filter_live.png');
    await page.screenshot({ path: searchScreenshotPath, fullPage: false });
    console.log('Saved search screenshot to:', searchScreenshotPath);

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('.patients-header-search-input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));
  }

  // 4. Test Doctor Details (/admin/doctors/:id)
  console.log('\n--- 3. Testing Doctor Details Page ---');
  // Click on the first doctor row
  await page.click('tbody tr.cursor-pointer');
  await page.waitForSelector('.doctor-profile-header', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));

  const doctorProfileData = await page.evaluate(() => {
    const name = document.querySelector('.doctor-profile-name')?.textContent.trim();
    const specialty = document.querySelector('.doctor-profile-specialty')?.textContent.trim();
    const status = document.querySelector('.doctor-profile-status-pill')?.textContent.trim();
    const fields = Array.from(document.querySelectorAll('.doctor-profile-field-block')).map(f => ({
      caption: f.querySelector('.doctor-profile-field-caption')?.textContent.trim(),
      value: f.querySelector('.doctor-profile-field-value')?.textContent.trim()
    }));
    const timeline = Array.from(document.querySelectorAll('.doctor-profile-timeline-step')).map(s => ({
      title: s.querySelector('.doctor-profile-timeline-step-title')?.textContent.trim(),
      sub: s.querySelector('.doctor-profile-timeline-step-sub')?.textContent.trim()
    }));
    return { name, specialty, status, fields, timeline };
  });
  console.log('Doctor Details Profile Data:', JSON.stringify(doctorProfileData, null, 2));

  const detailsScreenshotPath = path.join(artifactDir, 'doctor_details_profile_live.png');
  await page.screenshot({ path: detailsScreenshotPath, fullPage: false });
  console.log('Saved details screenshot to:', detailsScreenshotPath);

  // 5. Test Edit Doctor Profile Modal
  console.log('\n--- 4. Testing Edit Doctor Profile Dialog ---');
  const editBtn = await page.$('.doctor-profile-btn.edit');
  if (editBtn) {
    await editBtn.click();
    await page.waitForSelector('.doctor-edit-dialog-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));

    const editScreenshotPath = path.join(artifactDir, 'doctor_edit_dialog_live.png');
    await page.screenshot({ path: editScreenshotPath, fullPage: false });
    console.log('Saved edit dialog screenshot to:', editScreenshotPath);

    // Close dialog
    const closeBtn = await page.$('.doctor-edit-btn-cancel');
    if (closeBtn) await closeBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Test Doctor Registration Page (/admin/doctors/create)
  console.log('\n--- 5. Testing Doctor Registration Page (/admin/doctors/create) ---');
  await page.goto('http://localhost:5173/admin/doctors/create', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.add-doctor-canvas', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1000));

  const addScreenshotPath = path.join(artifactDir, 'doctor_add_form_live.png');
  await page.screenshot({ path: addScreenshotPath, fullPage: false });
  console.log('Saved add doctor form screenshot to:', addScreenshotPath);

  await browser.close();
  console.log('\nRuntime verification completed successfully!');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
