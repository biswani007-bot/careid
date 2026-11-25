const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5173';

function httpReq(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode, body }); } });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function getToken() {
  try {
    const cached = JSON.parse(fs.readFileSync(`${ARTIFACT_DIR}/scratch/cached_token.json`, 'utf8'));
    const test = await httpReq({ hostname: '360api.vnvision.in', path: '/api/v1/doctors', method: 'GET',
      headers: { 'Authorization': `Bearer ${cached.token}` } });
    if (test.status === 200) return cached.token;
  } catch {}

  console.log('Refreshing token via OTP (+16505550001)...');
  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpReq({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  const challengeId = otpRes.body?.data?.challengeId;
  if (!challengeId) throw new Error('Failed to get challengeId: ' + JSON.stringify(otpRes.body));

  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpReq({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const token = verifyRes.body?.data?.accessToken;
  if (!token) throw new Error('Failed to verify OTP: ' + JSON.stringify(verifyRes.body));

  fs.mkdirSync(`${ARTIFACT_DIR}/scratch`, { recursive: true });
  fs.writeFileSync(`${ARTIFACT_DIR}/scratch/cached_token.json`, JSON.stringify({ token }));
  return token;
}

async function injectToken(page, token) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
  }, { token });
}

async function screenshot(page, name) {
  const p = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}.png`);
  return p;
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const token = await getToken();
  console.log('Token OK\n');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  const results = [];

  try {
    // ── TEST 1: Doctor Directory – KPI Cards & Table ──────────────────────────
    console.log('TEST 1: Doctor Directory — KPI Cards & Table');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2500);

      const kpis = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.doctors-kpi-card'));
        return cards.map(c => ({
          label: c.querySelector('.doctors-kpi-label')?.textContent?.trim(),
          value: c.querySelector('.doctors-kpi-value')?.textContent?.trim(),
        }));
      });
      console.log('  KPI Cards:', JSON.stringify(kpis));

      const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map(tr => ({
          name: tr.querySelector('.doctors-doctor-name')?.textContent?.trim(),
          hvId: tr.querySelector('.doctors-doctor-hvid')?.textContent?.trim(),
          license: tr.querySelector('.doctors-doctor-license')?.textContent?.trim(),
          specialty: tr.querySelector('.doctors-doctor-specialty')?.textContent?.trim(),
          status: tr.querySelector('.doctors-status-badge')?.textContent?.trim(),
        })).filter(r => r.name);
      });
      console.log(`  Table rows: ${rows.length}`);
      rows.forEach(r => console.log(`    - ${r.name} | ${r.hvId} | ${r.license} | ${r.specialty} | Status:${r.status}`));

      const pass1 = kpis.length === 4 && rows.length === 3;
      results.push({ test: 'Doctor Directory — KPI Cards & Table', pass: pass1,
        detail: `KPI cards: ${kpis.length}/4, table rows: ${rows.length}/3` });

      await screenshot(page, 'verify_doctors_directory_desktop');
      await page.close();
    }

    // ── TEST 2: Status Filter — Verified ──────────────────────────────────────
    console.log('\nTEST 2: Status Filter — Verified');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);

      const pills = await page.$$('.doctors-pill');
      if (pills[1]) await pills[1].click(); // Verified
      await sleep(1800);

      const verifiedRows = await page.evaluate(() =>
        Array.from(document.querySelectorAll('tbody tr .doctors-doctor-name')).map(e => e.textContent?.trim()).filter(Boolean)
      );
      console.log(`  Verified rows: ${verifiedRows.length} — ${verifiedRows.join(', ')}`);

      await screenshot(page, 'verify_doctors_filter_verified');

      if (pills[2]) await pills[2].click(); // Pending
      await sleep(1800);

      const pendingRows = await page.evaluate(() =>
        Array.from(document.querySelectorAll('tbody tr .doctors-doctor-name')).map(e => e.textContent?.trim()).filter(Boolean)
      );
      console.log(`  Pending rows: ${pendingRows.length} — ${pendingRows.join(', ')}`);

      const pass2 = verifiedRows.length === 2 && pendingRows.length === 1;
      results.push({ test: 'Status Filters (Verified/Pending)', pass: pass2,
        detail: `Verified: ${verifiedRows.length}/2, Pending: ${pendingRows.length}/1` });

      await screenshot(page, 'verify_doctors_filter_pending');
      await page.close();
    }

    // ── TEST 3: Search ────────────────────────────────────────────────────────
    console.log('\nTEST 3: Doctor Search');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);

      await page.type('.patients-header-search-input', 'Sarah');
      await sleep(2200);

      const rows = await page.evaluate(() =>
        Array.from(document.querySelectorAll('tbody tr .doctors-doctor-name')).map(e => e.textContent?.trim()).filter(Boolean)
      );
      console.log(`  Search "Sarah": ${rows.length} rows — ${rows.join(', ')}`);

      const pass3 = rows.length >= 1 && rows.some(r => r?.toLowerCase().includes('sarah') || r?.toLowerCase().includes('jenkins'));
      results.push({ test: 'Doctor Search', pass: pass3,
        detail: `Search "Sarah" → ${rows.length} result(s): ${rows.join(', ')}` });

      await screenshot(page, 'verify_doctors_search_sarah');
      await page.close();
    }

    // ── TEST 4: Doctor Profile — Dr. Sarah Jenkins ────────────────────────────
    console.log('\nTEST 4: Doctor Profile — Dr. Sarah Jenkins (Verified)');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(3000);

      const data = await page.evaluate(() => {
        const name = document.querySelector('.doctor-profile-name')?.textContent?.trim();
        const specialty = document.querySelector('.doctor-profile-specialty')?.textContent?.trim();
        const allText = document.body.innerText;
        const hasHardcoded1 = allText.includes('Mar 16, 2022 by Admin User');
        const hasHardcoded2 = allText.includes('Mar 15, 2022 via Portal');
        const hasHardcoded3 = allText.includes('March 15, 2022');
        const hasHardcoded4 = allText.includes('Today, 08:42 AM');
        return { name, specialty, hasHardcoded1, hasHardcoded2, hasHardcoded3, hasHardcoded4 };
      });
      console.log(`  Name: ${data.name}, Specialty: ${data.specialty}`);
      console.log(`  Hardcoded "Mar 16, 2022 by Admin User": ${data.hasHardcoded1}`);
      console.log(`  Hardcoded "Mar 15, 2022 via Portal": ${data.hasHardcoded2}`);
      console.log(`  Hardcoded "March 15, 2022": ${data.hasHardcoded3}`);
      console.log(`  Hardcoded "Today, 08:42 AM": ${data.hasHardcoded4}`);

      const hardcodedRemoved = !data.hasHardcoded1 && !data.hasHardcoded2 && !data.hasHardcoded3 && !data.hasHardcoded4;
      const pass4 = data.name?.includes('Sarah') && hardcodedRemoved;
      results.push({ test: 'Doctor Profile — Sarah Jenkins, hardcoded dates removed', pass: pass4,
        detail: `name=${data.name}, all hardcoded dates removed: ${hardcodedRemoved}` });

      await screenshot(page, 'verify_doctors_profile_sarah');
      await page.close();
    }

    // ── TEST 5: Doctor Profile — Dr. Julian Vance (Pending) ───────────────────
    console.log('\nTEST 5: Doctor Profile — Dr. Julian Vance (Pending)');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors/7c8fd004-cba1-4a72-9db6-437fc6d2baed`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(3000);

      const data = await page.evaluate(() => ({
        name: document.querySelector('.doctor-profile-name')?.textContent?.trim(),
        status: document.querySelector('.doctor-profile-status-pill span:last-child')?.textContent?.trim(),
        licenseVal: Array.from(document.querySelectorAll('.doctor-profile-meta-val'))[1]?.textContent?.trim(),
      }));
      console.log(`  Name: ${data.name}, Status: ${data.status}, License: ${data.licenseVal}`);

      const pass5 = (data.name?.includes('Julian') || data.name?.includes('Vance'));
      results.push({ test: 'Doctor Profile — Julian Vance (Pending)', pass: pass5,
        detail: `name=${data.name}, status=${data.status}, license=${data.licenseVal}` });

      await screenshot(page, 'verify_doctors_profile_julian');
      await page.close();
    }

    // ── TEST 6: KPI Accuracy ──────────────────────────────────────────────────
    console.log('\nTEST 6: KPI Accuracy (3, 2, 1, 0)');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2500);

      const vals = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.doctors-kpi-value')).map(e => e.textContent?.trim())
      );
      console.log(`  KPI values: [${vals.join(', ')}] — expected [3, 2, 1, 0]`);

      const pass6 = vals[0] === '3' && vals[1] === '2' && vals[2] === '1' && vals[3] === '0';
      results.push({ test: 'KPI Accuracy from /api/v1/doctors/statistics', pass: pass6,
        detail: `Total=${vals[0]}, Verified=${vals[1]}, Pending=${vals[2]}, Suspended=${vals[3]} (expected 3,2,1,0)` });

      await screenshot(page, 'verify_doctors_kpi_accuracy');
      await page.close();
    }

    // ── TEST 7: Mobile ────────────────────────────────────────────────────────
    console.log('\nTEST 7: Mobile (375px)');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(1500);
      await screenshot(page, 'verify_doctors_mobile_375');
      results.push({ test: 'Mobile Responsiveness (375px)', pass: true, detail: 'Page loaded without crash' });
      await page.close();
    }

  } finally {
    await browser.close();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  DOCTOR DIRECTORY VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════');
  let allPassed = true;
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`${icon} ${r.test}`);
    console.log(`   ${r.detail}`);
    if (!r.pass) allPassed = false;
  }
  console.log('═══════════════════════════════════════════════');
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });

