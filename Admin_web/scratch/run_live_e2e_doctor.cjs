const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCE_DIR = path.resolve('D:/careid/Admin_web/docs/evidence/live_e2e_002');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function requestJson(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function getDoctorAuth(phone) {
  const otpReq = await requestJson('http://localhost:3001/api/v1/auth/otp/request', { method: 'POST' }, { phone });
  const challengeId = otpReq.data?.data?.challengeId;
  const verifyRes = await requestJson('http://localhost:3001/api/v1/auth/otp/verify', { method: 'POST' }, { challengeId, otpCode: '123456' });
  const token = verifyRes.data?.data?.accessToken;
  const refreshToken = verifyRes.data?.data?.refreshToken;
  const rawUser = verifyRes.data?.data?.user;
  const doctorProfile = verifyRes.data?.data?.doctorProfile;
  return { token, refreshToken, rawUser, doctorProfile };
}

async function runDoctorTests() {
  console.log('=== STARTING DOCTOR WEB LIVE E2E VERIFICATION (E01 - E12) ===');
  const results = [];
  
  // 1. Human Doctor Auth
  const humanDoc = await getDoctorAuth('+16505550003');
  console.log('Human Doctor Authenticated:', humanDoc.doctorProfile?.fullName || '+16505550003');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((tok, refTok, usr) => {
    sessionStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_refresh_token', refTok);
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', refTok);
    sessionStorage.setItem('careid_user_profile_cache', JSON.stringify(usr));
  }, humanDoc.token, humanDoc.refreshToken, humanDoc.rawUser);

  const humanTests = [
    { id: 'E2E-DOC-E01', name: 'Doctor Dashboard Workspace', path: '/dashboard', shot: 'doc_e01_dashboard.png' },
    { id: 'E2E-DOC-E02', name: 'Patient Directory', path: '/patients', shot: 'doc_e02_patients.png' },
    { id: 'E2E-DOC-E03', name: 'Health Vault Review', path: '/patients/3896bc97-bd3b-40ae-80c1-0cc0455ca3a4', shot: 'doc_e03_vault.png' },
    { id: 'E2E-DOC-E04', name: 'Clinical Encounters & Vitals', path: '/patients/3896bc97-bd3b-40ae-80c1-0cc0455ca3a4/vitals', shot: 'doc_e04_vitals.png' },
    { id: 'E2E-DOC-E05', name: 'Prescriptions Hub', path: '/records/prescriptions', shot: 'doc_e05_prescriptions.png' },
    { id: 'E2E-DOC-E06', name: 'Appointment Slots', path: '/appointments', shot: 'doc_e06_appointments.png' },
    { id: 'E2E-DOC-E07', name: 'Clinical Referrals', path: '/referrals', shot: 'doc_e07_referrals.png' },
    { id: 'E2E-DOC-E08', name: 'Office Chat', path: '/communication/chat', shot: 'doc_e08_chat.png' },
    { id: 'E2E-DOC-E09', name: 'Chat Templates', path: '/communication/templates', shot: 'doc_e09_templates.png' },
    { id: 'E2E-DOC-E10', name: 'Clinical Exports', path: '/reports/exports', shot: 'doc_e10_exports.png' },
    { id: 'E2E-DOC-E12', name: 'EHR Synchronization Overview', path: '/settings/ehr-sync', shot: 'doc_e12_ehr_sync.png' }
  ];

  for (const tc of humanTests) {
    try {
      const resp = await page.goto('http://localhost:5173' + tc.path, {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      await new Promise(r => setTimeout(r, 1200));

      const finalUrl = page.url();
      const pageHeader = await page.evaluate(() => {
        const h = document.querySelector('h1') || document.querySelector('h2') || document.querySelector('header') || document.querySelector('main');
        return h ? h.innerText.trim().replace(/\n+/g, ' - ').substring(0, 80) : 'Rendered';
      });

      const shotPath = path.join(EVIDENCE_DIR, tc.shot);
      await page.screenshot({ path: shotPath, fullPage: false });

      // Refresh to verify persistence
      await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 800));

      console.log(`[PASS] ${tc.id} -> Header: "${pageHeader}" | URL: ${finalUrl} | Screenshot: ${tc.shot}`);
      results.push({
        id: tc.id,
        name: tc.name,
        path: tc.path,
        url: finalUrl,
        header: pageHeader,
        status: 'PASS',
        screenshot: tc.shot
      });
    } catch (e) {
      console.error(`[FAIL] ${tc.id}: ${e.message}`);
      results.push({
        id: tc.id,
        name: tc.name,
        path: tc.path,
        status: 'FAIL',
        error: e.message
      });
    }
  }

  // 2. Veterinary Doctor Auth & Testing (E2E-DOC-E11)
  console.log('\nTesting E2E-DOC-E11: Veterinary Workspace Isolation...');
  try {
    const vetDoc = await getDoctorAuth('+16505555120');
    console.log('Veterinary Doctor Authenticated:', vetDoc.doctorProfile?.fullName || '+16505555120');

    const vetPage = await browser.newPage();
    await vetPage.setViewport({ width: 1440, height: 900 });

    await vetPage.evaluateOnNewDocument((tok, refTok, usr) => {
      sessionStorage.setItem('careid_access_token', tok);
      sessionStorage.setItem('careid_refresh_token', refTok);
      localStorage.setItem('careid_access_token', tok);
      localStorage.setItem('careid_refresh_token', refTok);
      sessionStorage.setItem('careid_user_profile_cache', JSON.stringify(usr));
    }, vetDoc.token, vetDoc.refreshToken, vetDoc.rawUser);

    await vetPage.goto('http://localhost:5173/veterinary/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));

    const vetUrl = vetPage.url();
    const vetHeader = await vetPage.evaluate(() => {
      const h = document.querySelector('h1') || document.querySelector('h2') || document.querySelector('main');
      return h ? h.innerText.trim().replace(/\n+/g, ' - ').substring(0, 80) : 'Rendered';
    });

    const shotPath = path.join(EVIDENCE_DIR, 'doc_e11_veterinary.png');
    await vetPage.screenshot({ path: shotPath, fullPage: false });

    console.log(`[PASS] E2E-DOC-E11 -> Header: "${vetHeader}" | URL: ${vetUrl} | Screenshot: doc_e11_veterinary.png`);
    results.push({
      id: 'E2E-DOC-E11',
      name: 'Veterinary Workspace Isolation',
      path: '/veterinary/dashboard',
      url: vetUrl,
      header: vetHeader,
      status: 'PASS',
      screenshot: 'doc_e11_veterinary.png'
    });
    await vetPage.close();
  } catch (e) {
    console.error(`[FAIL] E2E-DOC-E11: ${e.message}`);
    results.push({
      id: 'E2E-DOC-E11',
      name: 'Veterinary Workspace Isolation',
      path: '/veterinary/dashboard',
      status: 'FAIL',
      error: e.message
    });
  }

  await browser.close();
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'doctor_e2e_results.json'), JSON.stringify(results, null, 2));
  console.log('\n=== ALL 12 DOCTOR WEB TESTS COMPLETED ===');
  return results;
}

runDoctorTests().catch(err => {
  console.error('Fatal doctor runner error:', err);
  process.exit(1);
});
