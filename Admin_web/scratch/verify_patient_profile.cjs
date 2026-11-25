const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const cachedToken = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8')).token;

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // Pre-seed auth tokens in localStorage
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await page.evaluate((token) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'super-admin-id',
      email: 'admin@careid.test',
      fullName: 'Super Admin',
      roles: ['SUPER_ADMIN', 'ADMIN']
    }));
  }, cachedToken);

  console.log('Auth tokens seeded.');

  // ==========================================
  // TEST 1: FAILING PATIENT ID 9a4ad630-de90-40e9-b4cd-1d76f8f63069
  // ==========================================
  console.log('\n--- TEST 1: FAILING PATIENT ID ---');
  let patient500Requests = 0;
  page.on('request', req => {
    if (req.url().includes('/api/v1/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069')) {
      patient500Requests++;
      console.log(`[NETWORK] Outgoing request to failing endpoint (#${patient500Requests}):`, req.method(), req.url());
    }
  });

  await page.goto('http://localhost:5174/admin/patients/9a4ad630-de90-40e9-b4cd-1d76f8f63069', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 2000));

  // Verify rendered UI content
  const test1Data = await page.evaluate(() => {
    const name = document.querySelector('.patient-profile-name')?.textContent?.trim();
    const vaultId = document.querySelector('.patient-profile-vault-id')?.textContent?.trim();
    const statusBadge = document.querySelector('.patient-profile-status-badge')?.textContent?.trim();
    const banner = document.querySelector('.patient-profile-server-error-banner')?.textContent?.trim();
    const email = document.querySelector('.patient-profile-field-value')?.textContent?.trim();
    const vaultBannerCount = document.querySelector('.patient-profile-vault-banner-count')?.textContent?.trim();
    return { name, vaultId, statusBadge, bannerExists: Boolean(banner), bannerSnippet: banner?.slice(0, 100), email, vaultBannerCount };
  });

  console.log('Test 1 Rendered Data:', test1Data);
  console.log(`Test 1 Total Network Requests to 9a4ad630-de90-40e9-b4cd-1d76f8f63069: ${patient500Requests}`);

  const shot1Path = path.join(ARTIFACT_DIR, 'patient_profile_01_failing_id_handled.png');
  await page.screenshot({ path: shot1Path, fullPage: true });
  console.log('Saved screenshot 1 to:', shot1Path);

  // ==========================================
  // TEST 2: WORKING PATIENT efae0462-12f4-4f01-9ad9-a25906f517a8
  // ==========================================
  console.log('\n--- TEST 2: WORKING PATIENT (patient Dow) ---');
  await page.goto('http://localhost:5174/admin/patients/efae0462-12f4-4f01-9ad9-a25906f517a8', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 2000));

  const test2Data = await page.evaluate(() => {
    const name = document.querySelector('.patient-profile-name')?.textContent?.trim();
    const vaultId = document.querySelector('.patient-profile-vault-id')?.textContent?.trim();
    const statusBadge = document.querySelector('.patient-profile-status-badge')?.textContent?.trim();
    const banner = document.querySelector('.patient-profile-server-error-banner')?.textContent?.trim();
    return { name, vaultId, statusBadge, bannerExists: Boolean(banner) };
  });

  console.log('Test 2 Rendered Data:', test2Data);

  const shot2Path = path.join(ARTIFACT_DIR, 'patient_profile_02_working_patient.png');
  await page.screenshot({ path: shot2Path, fullPage: true });
  console.log('Saved screenshot 2 to:', shot2Path);

  // ==========================================
  // TEST 3: INVALID/NON-EXISTENT PATIENT ID
  // ==========================================
  console.log('\n--- TEST 3: NON-EXISTENT PATIENT ID ---');
  await page.goto('http://localhost:5174/admin/patients/00000000-0000-0000-0000-000000000000', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await new Promise(r => setTimeout(r, 2000));

  const test3Data = await page.evaluate(() => {
    const title = document.querySelector('.patient-profile-loading h2')?.textContent?.trim();
    const msg = document.querySelector('.patient-profile-loading p')?.textContent?.trim();
    const btn = document.querySelector('.patient-profile-btn-edit')?.textContent?.trim();
    return { title, msg, btn };
  });

  console.log('Test 3 Rendered Data:', test3Data);

  const shot3Path = path.join(ARTIFACT_DIR, 'patient_profile_03_invalid_id_not_found.png');
  await page.screenshot({ path: shot3Path, fullPage: true });
  console.log('Saved screenshot 3 to:', shot3Path);

  await browser.close();
  console.log('\nAll tests complete!');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

