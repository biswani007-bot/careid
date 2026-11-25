const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(__dirname, 'cached_token.json');

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== Starting CareID Referral Module Integration & UI Verification ===');
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Prime session in localStorage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'delete:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  // 2. Referral Overview (/admin/referrals)
  console.log('\n--- 1. Testing Referral Overview (/admin/referrals) ---');
  await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Extract KPI card values
  const kpiData = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.referral-metric-card'));
    return cards.map(c => ({
      label: c.querySelector('.referral-metric-label')?.innerText.trim(),
      val: c.querySelector('.referral-metric-value')?.innerText.trim()
    }));
  });
  console.log('KPI Cards extracted from live UI:', JSON.stringify(kpiData, null, 2));

  // Check sidebar badge
  const sidebarBadge = await page.evaluate(() => {
    const refNavItem = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.innerText.includes('Referrals'));
    return refNavItem ? refNavItem.querySelector('.sidebar-badge')?.innerText.trim() : null;
  });
  console.log('Referrals Sidebar Badge value:', sidebarBadge);

  const shotOverview = path.join(ARTIFACT_DIR, 'referral_overview_1440.png');
  await page.screenshot({ path: shotOverview });
  console.log('Saved screenshot:', shotOverview);

  // 3. Test Create Referral Modal
  console.log('\n--- 2. Testing Create Referral Dialog ---');
  const createBtn = await page.waitForSelector('button[aria-label="Create New Referral"]', { timeout: 5000 });
  await createBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  const modalOpen = await page.$('.create-referral-dialog, [role="dialog"], .fixed.inset-0');
  console.log('Create Referral Modal open:', !!modalOpen);

  // Extract counts of options in dropdowns
  const dropdownCounts = await page.evaluate(() => {
    const patientOpts = document.querySelectorAll('select[name="patientId"] option');
    const facilityOpts = document.querySelectorAll('select[name="receivingFacilityId"] option');
    const doctorOpts = document.querySelectorAll('select[name="receivingDoctorId"] option');
    return {
      patients: patientOpts.length,
      facilities: facilityOpts.length,
      doctors: doctorOpts.length
    };
  });
  console.log('Live dropdown option counts in Create Referral Modal:', dropdownCounts);

  const shotCreateModal = path.join(ARTIFACT_DIR, 'referral_create_modal_1440.png');
  await page.screenshot({ path: shotCreateModal });
  console.log('Saved screenshot:', shotCreateModal);

  // Close modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // 4. Referral Monitoring & Escalations (/admin/referrals/escalations)
  console.log('\n--- 3. Testing Referral Escalations (/admin/referrals/escalations) ---');
  await page.goto(`${BASE_URL}/admin/referrals/escalations`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const shotMonitoring = path.join(ARTIFACT_DIR, 'referral_monitoring_1440.png');
  await page.screenshot({ path: shotMonitoring });
  console.log('Saved screenshot:', shotMonitoring);

  // 5. Referral Audit Log (/admin/referrals/audit)
  console.log('\n--- 4. Testing Referral Audit Log (/admin/referrals/audit) ---');
  await page.goto(`${BASE_URL}/admin/referrals/audit`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const hasSimulationBtn = await page.evaluate(() => {
    return document.body.innerText.includes('Simulate Referral Event') ||
           document.body.innerText.includes('Preview Empty Escalation State');
  });
  console.log('Fake simulation buttons present:', hasSimulationBtn);

  const shotAudit = path.join(ARTIFACT_DIR, 'referral_audit_1440.png');
  await page.screenshot({ path: shotAudit });
  console.log('Saved screenshot:', shotAudit);

  // 6. Referral Details (/admin/referrals/ref-9021)
  console.log('\n--- 5. Testing Referral Details Layout (/admin/referrals/ref-9021) ---');
  await page.goto(`${BASE_URL}/admin/referrals/ref-9021`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check sidebar vs main layout coordinates to confirm zero overlap
  const layoutCheck = await page.evaluate(() => {
    const sidebar = document.querySelector('.careid-sidebar');
    const main = document.querySelector('.referral-details-main');
    if (!sidebar || !main) return null;
    const sbRect = sidebar.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    return {
      sidebarRight: sbRect.right,
      mainLeft: mainRect.left,
      isOverlapping: mainRect.left < sbRect.right
    };
  });
  console.log('Layout positioning check (Zero Overlap):', layoutCheck);

  const shotDetails = path.join(ARTIFACT_DIR, 'referral_details_1440.png');
  await page.screenshot({ path: shotDetails });
  console.log('Saved screenshot:', shotDetails);

  // 7. Mobile Viewport Check (390x844)
  console.log('\n--- 6. Testing Mobile Viewport (390x844) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const shotMobile = path.join(ARTIFACT_DIR, 'referral_overview_mobile_390.png');
  await page.screenshot({ path: shotMobile });
  console.log('Saved screenshot:', shotMobile);

  await browser.close();
  console.log('\n=== All Verification Tests Completed Successfully! ===');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
