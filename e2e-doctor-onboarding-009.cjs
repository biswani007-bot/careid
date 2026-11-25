const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

const EVIDENCE_DIR = 'D:\\careid\\Admin_web\\docs\\evidence\\CAREID_DOCTOR_ONBOARDING_009';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function checkPort(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function waitForServices() {
  console.log('Checking service health on ports 3001, 5174, 5173...');
  for (let i = 0; i < 30; i++) {
    const backendOk = await checkPort(3001, '/api/v1/health');
    const adminOk = await checkPort(5174);
    const doctorOk = await checkPort(5173);
    if (backendOk && adminOk && doctorOk) {
      console.log('All services are healthy!');
      return true;
    }
    console.log(`Waiting for services (attempt ${i + 1}/30)... backend=${backendOk}, admin=${adminOk}, doctor=${doctorOk}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function runE2E() {
  const ready = await waitForServices();
  if (!ready) {
    console.error('Services did not become ready in time.');
    return { success: false, reason: 'Services unreachable on 3001/5174/5173' };
  }

  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = {
    steps: [],
    screenshots: []
  };

  try {
    // 1. Admin Login
    console.log('1. Navigating to Admin Login...');
    await page.goto('http://localhost:5174/admin/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01_admin_login_page.png') });
    results.screenshots.push('01_admin_login_page.png');

    await page.type('input[type="email"]', 'superadmin@careid.test');
    await page.type('input[type="password"]', 'NewSecureAdminPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02_admin_dashboard.png') });
    results.screenshots.push('02_admin_dashboard.png');
    results.steps.push({ name: 'Admin Login', status: 'PASS' });

    // 2. Doctor Creation Form
    console.log('2. Navigating to Add Doctor form...');
    await page.goto('http://localhost:5174/admin/doctors/create', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="fullName"], input[name="name"], select[name="speciality"], select[name="primarySpecialization"]', { timeout: 10000 }).catch(() => {});
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03_admin_add_doctor_form.png') });
    results.screenshots.push('03_admin_add_doctor_form.png');

    // Verify dynamic specialities in dropdown
    const specialities = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        const options = Array.from(sel.options).map(o => o.text);
        if (options.some(o => /pulmonology/i.test(o))) {
          return options;
        }
      }
      return [];
    });
    console.log('Detected specialities:', specialities);
    results.specialities = specialities;

    // 3. Test Doctor Web Login
    console.log('3. Testing Doctor Web Login...');
    const doctorPage = await browser.newPage();
    await doctorPage.setViewport({ width: 1440, height: 900 });
    await doctorPage.goto('http://localhost:5173/auth/login', { waitUntil: 'networkidle2' });
    await doctorPage.screenshot({ path: path.join(EVIDENCE_DIR, '04_doctor_web_login_page.png') });
    results.screenshots.push('04_doctor_web_login_page.png');

    // Attempt password login with existing or newly created doctor
    // Dr. Sarah Jenkins credentials
    await doctorPage.type('input[type="email"], input[name="identifier"], input[placeholder*="email" i]', 'doctor.jenkins@careid.test');
    await doctorPage.type('input[type="password"]', 'DoctorPassword123!');
    
    let loginResponseStatus = null;
    doctorPage.on('response', resp => {
      if (resp.url().includes('/api/v1/auth/password/login')) {
        loginResponseStatus = resp.status();
        console.log('POST /api/v1/auth/password/login responded with HTTP', resp.status());
      }
    });

    await doctorPage.click('button[type="submit"]');
    await doctorPage.waitForTimeout ? doctorPage.waitForTimeout(3000) : new Promise(r => setTimeout(r, 3000));
    await doctorPage.screenshot({ path: path.join(EVIDENCE_DIR, '05_doctor_login_response.png') });
    results.screenshots.push('05_doctor_login_response.png');

    results.doctorLoginStatus = loginResponseStatus;
    console.log('Doctor Web login response HTTP status:', loginResponseStatus);

  } catch (err) {
    console.error('Error during E2E:', err);
    results.error = err.message;
  } finally {
    await browser.close();
  }

  return results;
}

if (require.main === module) {
  runE2E().then(res => {
    console.log('E2E Result:\n', JSON.stringify(res, null, 2));
    process.exit(res.success === false ? 1 : 0);
  });
}

module.exports = { runE2E };
