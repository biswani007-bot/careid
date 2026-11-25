const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

async function main() {
  console.log('--- STARTING ADD DOCTOR PRIMARY HOSPITAL DROPDOWN VERIFICATION ---');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));
  const token = tokenData.token;

  // Initialize Auth
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'usr_superadmin',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator',
      email: 'superadmin@careid.test'
    }));
  }, token);

  // 1. Navigate to Add Doctor page
  console.log('\n[TEST 1] Navigating to /admin/doctors/add...');
  await page.goto('http://localhost:5173/admin/doctors/add', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#hospital', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // 2. Inspect options of #hospital select
  console.log('\n[TEST 2] Inspecting #hospital options in DOM...');
  const hospitalOptions = await page.evaluate(() => {
    const select = document.querySelector('#hospital');
    if (!select) return null;
    const options = Array.from(select.querySelectorAll('option'));
    return options.map(opt => ({
      value: opt.value,
      label: opt.textContent.trim(),
      disabled: opt.disabled,
    }));
  });

  console.log('Hospital Dropdown Options found:', hospitalOptions);

  // Check 1: Must contain Metro General Hospital
  const metroOpt = hospitalOptions.find(o => o.label.includes('Metro General Hospital'));
  if (!metroOpt) {
    throw new Error('Did not find live facility "Metro General Hospital" in dropdown!');
  }
  console.log('✓ Found live facility:', metroOpt);

  // Check 2: Option value must be the backend facility UUID
  if (metroOpt.value !== '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb') {
    throw new Error(`Expected UUID 3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb, got ${metroOpt.value}`);
  }
  console.log('✓ Option value is verified UUID:', metroOpt.value);

  // Check 3: None of the old hardcoded options should exist
  const hardcodedNames = [
    'Metropolitan General',
    'St. Jude Medical Center',
    'City Health Clinic',
    "Valley Children's Hospital"
  ];
  for (const hName of hardcodedNames) {
    const found = hospitalOptions.some(o => o.label === hName || o.value === hName);
    if (found) {
      throw new Error(`Hardcoded option "${hName}" is still present in dropdown!`);
    }
  }
  console.log('✓ Verified: zero hardcoded mock hospitals present in options!');

  // Take screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_add_doctor_hospital_dropdown.png') });
  console.log('✓ Screenshot saved to verify_add_doctor_hospital_dropdown.png');

  // 3. Test Form Validation (empty hospital)
  console.log('\n[TEST 3] Testing form validation when hospital is not selected...');
  await page.evaluate(() => {
    const btn = document.querySelector('.add-doctor-submit-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const validationErrors = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('.add-doctor-error-msg'));
    return errs.map(e => e.textContent.trim());
  });
  console.log('Validation errors:', validationErrors);
  if (!validationErrors.some(e => e.includes('hospital'))) {
    throw new Error('Expected validation error for hospital selection');
  }
  console.log('✓ Hospital validation error displayed correctly.');

  console.log('\nALL ADD DOCTOR DROPDOWN VERIFICATION TESTS PASSED!');
  await browser.close();
}

main().catch(err => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});

