const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFreshToken() {
  if (fs.existsSync('scratch/cached_token.json')) {
    try {
      const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
      const parts = cached.token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (Math.floor(Date.now() / 1000) < payload.exp - 60) {
        console.log('Using valid cached Super Admin token...');
        return cached.token;
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
    user: authData.user,
    expiresAt: Date.now() + 15 * 60 * 1000
  };
  fs.writeFileSync('scratch/cached_token.json', JSON.stringify(tokenPayload, null, 2));
  return authData.accessToken;
}

async function run() {
  const token = await getFreshToken();

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  console.log('Setting auth session in localStorage...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('token', tok);
    localStorage.setItem('careid_user', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  const artifactsDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

  // --- 1. Referral Overview / Dashboard ---
  console.log('\n--- 1. Testing Referral Dashboard (/admin/referrals) ---');
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-bento-grid', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  // Read KPIs
  const kpis = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.map(c => ({
      label: c.querySelector('.referral-metric-label')?.textContent?.trim(),
      val: c.querySelector('.referral-metric-value')?.textContent?.trim()
    }));
  });
  console.log('Referral Dashboard KPIs:', JSON.stringify(kpis, null, 2));

  // Check table area state
  const tableState = await page.evaluate(() => {
    const errorEl = document.querySelector('.referral-table-wrapper h3');
    const retryBtn = document.querySelector('.referral-table-wrapper button');
    return {
      hasError: !!errorEl,
      errorText: errorEl?.textContent?.trim(),
      hasRetryBtn: !!retryBtn
    };
  });
  console.log('Table Area Status:', tableState);

  const dashShot = path.join(artifactsDir, 'referral_dashboard_live.png');
  await page.screenshot({ path: dashShot, fullPage: false });
  console.log('Saved dashboard screenshot to:', dashShot);

  // --- 2. Create Referral Modal ---
  console.log('\n--- 2. Testing Create Referral Dialog ---');
  await page.click('button.referral-create-btn');
  await page.waitForSelector('.create-referral-modal', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 1000));

  const modalOptions = await page.evaluate(() => {
    const patientOpts = Array.from(document.querySelectorAll('#cr-patient-select option')).map(o => o.textContent?.trim());
    const facilityOpts = Array.from(document.querySelectorAll('#cr-facility-select option')).map(o => o.textContent?.trim());
    const docOpts = Array.from(document.querySelectorAll('#cr-doctor-select option')).map(o => o.textContent?.trim());
    return {
      patientsCount: patientOpts.length,
      samplePatient: patientOpts[1] || patientOpts[0],
      facilitiesCount: facilityOpts.length,
      sampleFacility: facilityOpts[1] || facilityOpts[0],
      doctorsCount: docOpts.length
    };
  });
  console.log('Create Referral Dropdowns Loaded:', modalOptions);

  const createShot = path.join(artifactsDir, 'referral_create_modal_live.png');
  await page.screenshot({ path: createShot, fullPage: false });
  console.log('Saved create modal screenshot to:', createShot);

  // Close modal
  await page.click('.create-referral-close-btn');
  await new Promise(r => setTimeout(r, 500));

  // --- 3. Referral Details ---
  console.log('\n--- 3. Testing Referral Details (/admin/referrals/ref-9021) ---');
  await page.goto('http://localhost:5173/admin/referrals/ref-9021', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.referral-details-canvas', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const detailsHeader = await page.evaluate(() => {
    const heading = document.querySelector('.referral-main-heading')?.textContent?.trim();
    const actions = Array.from(document.querySelectorAll('.referral-header-actions button')).map(b => b.textContent?.trim());
    return { heading, actions };
  });
  console.log('Referral Details Header:', detailsHeader);

  const detailsShot = path.join(artifactsDir, 'referral_details_live.png');
  await page.screenshot({ path: detailsShot, fullPage: false });
  console.log('Saved details screenshot to:', detailsShot);

  // --- 4. Referral Escalation & SLA Monitoring ---
  console.log('\n--- 4. Testing Referral Escalations (/admin/referrals/escalations) ---');
  await page.goto('http://localhost:5173/admin/referrals/escalations', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.monitoring-metrics-grid', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const escalationMetrics = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.monitoring-metric-card'));
    return cards.map(c => ({
      label: c.querySelector('.monitoring-metric-label')?.textContent?.trim(),
      val: c.querySelector('.monitoring-metric-value')?.textContent?.trim()
    }));
  });
  console.log('Escalation KPIs:', escalationMetrics);

  const escalationsShot = path.join(artifactsDir, 'referral_escalations_live.png');
  await page.screenshot({ path: escalationsShot, fullPage: false });
  console.log('Saved escalations screenshot to:', escalationsShot);

  // --- 5. Referral Audit Log ---
  console.log('\n--- 5. Testing Referral Audit Log (/admin/referrals/audit) ---');
  await page.goto('http://localhost:5173/admin/referrals/audit', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.audit-main-wrapper', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  const auditLogRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.audit-table tbody tr'));
    return {
      rowCount: rows.length,
      sampleRow: rows[0]?.innerText?.replace(/\n/g, ' | ')
    };
  });
  console.log('Audit Log Table Status:', auditLogRows);

  const auditShot = path.join(artifactsDir, 'referral_audit_live.png');
  await page.screenshot({ path: auditShot, fullPage: false });
  console.log('Saved audit screenshot to:', auditShot);

  await browser.close();
  console.log('\nAll runtime tests completed successfully!');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
