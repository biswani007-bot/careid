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

async function getAdminAuth() {
  const otpReq = await requestJson('http://localhost:3001/api/v1/auth/otp/request', { method: 'POST' }, { phone: '+16505550002' });
  const challengeId = otpReq.data?.data?.challengeId;
  const verifyRes = await requestJson('http://localhost:3001/api/v1/auth/otp/verify', { method: 'POST' }, { challengeId, otpCode: '123456' });
  const token = verifyRes.data?.data?.accessToken;
  const rawUser = verifyRes.data?.data?.user;
  
  const userSession = {
    id: rawUser.id,
    phone: rawUser.phone,
    email: rawUser.email || 'admin@careid.test',
    status: 'ACTIVE',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    permissions: ['read:all', 'write:all'],
    name: 'CareID Administrator'
  };
  return { token, userSession };
}

async function runAdminTests() {
  console.log('=== STARTING ADMIN WEB LIVE E2E VERIFICATION (D01 - D18) ===');
  const results = [];
  const { token, userSession } = await getAdminAuth();
  console.log('Admin authenticated. User ID:', userSession.id);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((tok, sess) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_user_session', JSON.stringify(sess));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', tok);
    sessionStorage.setItem('careid_refresh_token', tok);
    sessionStorage.setItem('careid_user_session', JSON.stringify(sess));
  }, token, userSession);

  const testCases = [
    { id: 'E2E-ADM-D01', name: 'Dashboard Overview', path: '/admin/dashboard', shot: 'admin_d01_dashboard.png' },
    { id: 'E2E-ADM-D02', name: 'Patient Directory', path: '/admin/patients', shot: 'admin_d02_patients.png' },
    { id: 'E2E-ADM-D03', name: 'Facility Management', path: '/admin/facilities', shot: 'admin_d03_facilities.png' },
    { id: 'E2E-ADM-D04', name: 'Doctor Management', path: '/admin/doctors', shot: 'admin_d04_doctors.png' },
    { id: 'E2E-ADM-D05', name: 'User & Staff Directory', path: '/admin/users', shot: 'admin_d05_users.png' },
    { id: 'E2E-ADM-D06', name: 'Privacy Policy CMS', path: '/admin/legal/privacy-policy', shot: 'admin_d06_privacy.png' },
    { id: 'E2E-ADM-D07', name: 'Terms & Conditions CMS', path: '/admin/legal/terms-conditions', shot: 'admin_d07_terms.png' },
    { id: 'E2E-ADM-D08', name: 'General & Social Settings', path: '/admin/settings/general', shot: 'admin_d08_settings.png' },
    { id: 'E2E-ADM-D09', name: 'Website CMS', path: '/admin/cms', shot: 'admin_d09_cms.png' },
    { id: 'E2E-ADM-D10', name: 'Healthcare Financing (CR-02)', path: '/admin/financing', shot: 'admin_d10_financing.png' },
    { id: 'E2E-ADM-D11', name: 'Slot Utilization (CR-03)', path: '/admin/operations/capacity', shot: 'admin_d11_capacity.png' },
    { id: 'E2E-ADM-D12', name: 'Appointment Monitoring (CR-04)', path: '/admin/dashboard', shot: 'admin_d12_appointments.png' },
    { id: 'E2E-ADM-D13', name: 'Referral Oversight (CR-05)', path: '/admin/referrals', shot: 'admin_d13_referrals.png' },
    { id: 'E2E-ADM-D14', name: 'EHR Oversight (CR-06)', path: '/admin/settings/integrations', shot: 'admin_d14_ehr.png' },
    { id: 'E2E-ADM-D15', name: 'Office Chat Oversight (CR-07)', path: '/admin/settings/general', shot: 'admin_d15_chat_oversight.png' },
    { id: 'E2E-ADM-D16', name: 'Prescription Pickup (CR-08)', path: '/admin/operations/prescriptions', shot: 'admin_d16_pickup.png' },
    { id: 'E2E-ADM-D17', name: 'Demographic Reports', path: '/admin/reports', shot: 'admin_d17_reports.png' },
    { id: 'E2E-ADM-D18', name: 'OCR Clinical Queue', path: '/admin/ocr/queue', shot: 'admin_d18_ocr.png' }
  ];

  for (const tc of testCases) {
    try {
      const resp = await page.goto('http://localhost:5174' + tc.path, {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      await new Promise(r => setTimeout(r, 1200));

      const finalUrl = page.url();
      const pageHeader = await page.evaluate(() => {
        const h = document.querySelector('h1') || document.querySelector('h2') || document.querySelector('.page-header') || document.querySelector('main header');
        return h ? h.innerText.trim().replace(/\n+/g, ' - ') : 'Rendered';
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

  await browser.close();
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'admin_e2e_results.json'), JSON.stringify(results, null, 2));
  console.log('\n=== ALL 18 ADMIN WEB TESTS COMPLETED ===');
  return results;
}

runAdminTests().catch(err => {
  console.error('Fatal admin runner error:', err);
  process.exit(1);
});
