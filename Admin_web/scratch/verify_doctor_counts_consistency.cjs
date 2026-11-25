const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');
const https = require('https');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';

function httpReq(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
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

  const reqData = JSON.stringify({ phone: '+16505550001' });
  const otpRes = await httpReq({
    hostname: '360api.vnvision.in', path: '/api/v1/auth/otp/request', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
  }, reqData);

  const challengeId = otpRes.body?.data?.challengeId;
  const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
  const verifyRes = await httpReq({
    hostname: '360api.vnvision.in', path: '/api/v1/auth/otp/verify', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
  }, verifyData);

  const token = verifyRes.body?.data?.accessToken;
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
    // ── TEST 1: User Directory — Doctors Filter Banner & Count ─────────────────
    console.log('TEST 1: User Directory — Doctors Filter Banner & Count');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(1500);

      // Click "Doctors" chip
      const chips = await page.$$('.users-filter-chip');
      let doctorsChip = null;
      for (const c of chips) {
        const text = await page.evaluate(el => el.textContent?.trim(), c);
        if (text === 'Doctors') { doctorsChip = c; break; }
      }
      if (doctorsChip) await doctorsChip.click();
      await sleep(2000);

      const tableRows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map(tr => ({
          name: tr.querySelector('.user-name')?.textContent?.trim(),
          role: tr.querySelector('.user-role-badge')?.textContent?.trim(),
        })).filter(r => r.name);
      });
      console.log('  Doctors filter table rows:', JSON.stringify(tableRows));

      const bannerText = await page.evaluate(() => {
        const banner = document.querySelector('.users-table-card')?.previousElementSibling;
        return banner?.textContent?.trim() || '';
      });
      console.log('  Doctors filter banner text:', bannerText);

      const pass1 = tableRows.length === 1 && tableRows[0].name.includes('Sarah') && bannerText.includes('Dr. Robert Chen') && bannerText.includes('Dr. Julian Vance');
      results.push({
        test: 'User Directory — Doctors Filter & Banner',
        pass: pass1,
        detail: `Row: ${tableRows[0]?.name} (${tableRows[0]?.role}), Banner explains Dr. Chen and Dr. Vance: ${pass1}`
      });

      await screenshot(page, 'verify_users_doctors_filter_clarification');
      await page.close();
    }

    // ── TEST 2: User Directory — Admins Filter shows Chen & Vance Doctor Badge ─
    console.log('\nTEST 2: User Directory — Admins Filter shows Chen & Vance Doctor Badges');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(1500);

      const chips = await page.$$('.users-filter-chip');
      let adminsChip = null;
      for (const c of chips) {
        const text = await page.evaluate(el => el.textContent?.trim(), c);
        if (text === 'Admins') { adminsChip = c; break; }
      }
      if (adminsChip) await adminsChip.click();
      await sleep(2000);

      const adminRows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map(tr => ({
          name: tr.querySelector('.user-name')?.textContent?.trim(),
          role: tr.querySelector('.user-role-badge')?.textContent?.trim(),
          doctorProfileTag: tr.querySelector('.text-\\[10px\\]')?.textContent?.trim() || '',
        })).filter(r => r.name);
      });
      console.log('  Admins filter rows:', JSON.stringify(adminRows));

      const hasChenDoctorTag = adminRows.some(r => r.name?.includes('Chen') && r.doctorProfileTag?.includes('Doctor Profile'));
      const hasVanceDoctorTag = adminRows.some(r => r.name?.includes('Vance') && r.doctorProfileTag?.includes('Doctor Profile'));
      const pass2 = adminRows.length === 3 && hasChenDoctorTag && hasVanceDoctorTag;

      results.push({
        test: 'User Directory — Admins Filter Doctor Badges',
        pass: pass2,
        detail: `Found 3 admins, Dr. Chen badge: ${hasChenDoctorTag}, Dr. Vance badge: ${hasVanceDoctorTag}`
      });

      await screenshot(page, 'verify_users_admins_filter_doctor_badges');
      await page.close();
    }

    // ── TEST 3: User Details — Linked Doctor Profile Section ───────────────────
    console.log('\nTEST 3: User Details — Linked Doctor Profile Section');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      // Dr. Robert Chen User ID: bc6f6875-434c-4050-b893-07343cc27986
      await page.goto(`${BASE_URL}/admin/users/bc6f6875-434c-4050-b893-07343cc27986`, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForFunction(() => {
        const name = document.querySelector('.profile-card-name')?.textContent?.trim();
        return name && name !== 'Loading...';
      }, { timeout: 10000 });
      await sleep(1000);

      const userDetailsInfo = await page.evaluate(() => {
        const name = document.querySelector('.profile-card-name')?.textContent?.trim();
        const role = document.querySelector('.profile-card-role')?.textContent?.trim();
        const pageText = document.body.innerText;
        const hasLinkedDocSection = pageText.includes('LINKED DOCTOR PROFILE');
        const hasCardiology = pageText.includes('Cardiology');
        const hasRegNum = pageText.includes('MED-REG-2026-1192');
        return { name, role, hasLinkedDocSection, hasCardiology, hasRegNum };
      });
      console.log('  Dr. Chen User Details:', JSON.stringify(userDetailsInfo));

      const pass3 = userDetailsInfo.name?.includes('Chen') && userDetailsInfo.hasLinkedDocSection && userDetailsInfo.hasRegNum;
      results.push({
        test: 'User Details — Linked Doctor Profile Section',
        pass: pass3,
        detail: `User ${userDetailsInfo.name} (${userDetailsInfo.role}) displays linked Doctor Profile: ${pass3}`
      });

      await screenshot(page, 'verify_user_details_linked_doctor_profile');
      await page.close();
    }

    // ── TEST 4: Doctor Directory — KPI Subtexts & Row Auth Roles ──────────────
    console.log('\nTEST 4: Doctor Directory — KPI Subtexts & Row Auth Roles');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2', timeout: 20000 });
      await page.waitForSelector('.doctors-doctor-name', { timeout: 10000 });
      await sleep(1000);

      const kpis = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.doctors-kpi-card'));
        return cards.map(c => ({
          label: c.querySelector('.doctors-kpi-label')?.textContent?.trim(),
          val: c.querySelector('.doctors-kpi-value')?.textContent?.trim(),
          sub: c.querySelector('.text-\\[11px\\]')?.textContent?.trim() || '',
        }));
      });
      console.log('  Doctor Directory KPIs with subtexts:', JSON.stringify(kpis));

      const rows = await page.evaluate(() => {
        const trs = Array.from(document.querySelectorAll('tbody tr'));
        return trs.map(tr => ({
          name: tr.querySelector('.doctors-doctor-name')?.textContent?.trim(),
          authRole: tr.querySelector('.text-\\[11px\\]')?.textContent?.trim() || '',
        })).filter(r => r.name);
      });
      console.log('  Doctor Directory Rows with auth roles:', JSON.stringify(rows));

      const totalKpiPass = kpis[0]?.val === '3' && kpis[0]?.sub?.includes('3 registered profiles · 1 DOCTOR role account');
      const pass4 = totalKpiPass && rows.length === 3;
      results.push({
        test: 'Doctor Directory — KPI Subtexts & Auth Role Badges',
        pass: pass4,
        detail: `Total KPI: "${kpis[0]?.val}" (${kpis[0]?.sub}), Rows: ${rows.length}`
      });

      await screenshot(page, 'verify_doctor_directory_kpi_subtexts');
      await page.close();
    }

    // ── TEST 5: Doctor Profile — Linked User Account Field ────────────────────
    console.log('\nTEST 5: Doctor Profile — Linked User Account Field');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await injectToken(page, token);
      // Dr. Robert Chen Doctor Profile ID: 5ab2e715-bf8f-4fd4-98bb-c5166dd7157b
      await page.goto(`${BASE_URL}/admin/doctors/5ab2e715-bf8f-4fd4-98bb-c5166dd7157b`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2500);

      const profileInfo = await page.evaluate(() => {
        const name = document.querySelector('.doctor-profile-name')?.textContent?.trim();
        const pageText = document.body.innerText;
        const hasLinkedUserAccount = pageText.includes('LINKED USER ACCOUNT');
        const hasSuperAdminPhone = pageText.includes('+16505550001');
        const hasSuperAdminRole = pageText.includes('Super Admin');
        return { name, hasLinkedUserAccount, hasSuperAdminPhone, hasSuperAdminRole };
      });
      console.log('  Dr. Chen Doctor Profile Info:', JSON.stringify(profileInfo));

      const pass5 = profileInfo.name?.includes('Chen') && profileInfo.hasLinkedUserAccount && profileInfo.hasSuperAdminPhone;
      results.push({
        test: 'Doctor Profile — Linked User Account Field',
        pass: pass5,
        detail: `Profile ${profileInfo.name} displays linked user account (+16505550001 · Super Admin): ${pass5}`
      });

      await screenshot(page, 'verify_doctor_profile_linked_user_account');
      await page.close();
    }

  } finally {
    await browser.close();
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  DOCTOR COUNT CONSISTENCY TEST SUMMARY');
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
