const puppeteer = require('puppeteer-core');
const path = require('path');
const { getAdminToken } = require('../scratch/token_helper.cjs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5174';
const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function run() {
  const token = await getAdminToken();
  console.log('Obtained admin token.');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1080'],
    defaultViewport: { width: 1440, height: 1080 }
  });

  const page = await browser.newPage();

  // Set auth tokens in localStorage
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_refresh_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'super-admin-id',
      email: 'admin@careid.com',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  console.log('Navigating to Dr. Sara Jenkins profile...');
  await page.goto(`${BASE_URL}/admin/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Extract displayed values
  const profileData = await page.evaluate(() => {
    const textOf = (sel) => document.querySelector(sel)?.innerText?.trim();
    const allCaptions = Array.from(document.querySelectorAll('.doctor-profile-field-caption'));
    const fieldMap = {};
    allCaptions.forEach(c => {
      const val = c.parentElement?.querySelector('.doctor-profile-field-value')?.innerText?.trim();
      if (val) fieldMap[c.innerText.trim()] = val;
    });

    return {
      name: textOf('.doctor-profile-name'),
      specialty: textOf('.doctor-profile-specialty'),
      fieldMap,
      htmlSnippet: document.querySelector('.doctor-profile-prof-grid')?.innerText
    };
  });

  console.log('Profile data on UI:', JSON.stringify(profileData, null, 2));

  // Screenshot 1: Dr. Sara Jenkins Profile
  const ss1Path = path.join(ARTIFACT_DIR, 'doctor_profile_01_target_jenkins.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log('Saved screenshot 1 to', ss1Path);

  // Click Edit Profile Button
  console.log('Opening Edit Profile modal...');
  const editBtnClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const editBtn = btns.find(b => b.innerText.includes('Edit Profile'));
    if (editBtn) {
      editBtn.click();
      return true;
    }
    return false;
  });

  if (editBtnClicked) {
    await new Promise(r => setTimeout(r, 1000));
    const modalData = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('.doctor-edit-field'));
      return inputs.map(f => {
        const label = f.querySelector('label')?.innerText?.trim();
        const input = f.querySelector('input');
        return { label, value: input?.value, disabled: input?.disabled, readOnly: input?.readOnly };
      });
    });
    console.log('Modal field values:', JSON.stringify(modalData, null, 2));

    const ss2Path = path.join(ARTIFACT_DIR, 'doctor_profile_02_edit_modal.png');
    await page.screenshot({ path: ss2Path, fullPage: false });
    console.log('Saved screenshot 2 to', ss2Path);

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.doctor-edit-close-btn');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Test doctor without facility (Dr. Robert Chen: 5ab2e715-bf8f-4fd4-98bb-c5166dd7157b)
  console.log('Navigating to unassigned doctor (Dr. Robert Chen)...');
  await page.goto(`${BASE_URL}/admin/doctors/5ab2e715-bf8f-4fd4-98bb-c5166dd7157b`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const chenData = await page.evaluate(() => {
    const allCaptions = Array.from(document.querySelectorAll('.doctor-profile-field-caption'));
    const fieldMap = {};
    allCaptions.forEach(c => {
      const val = c.parentElement?.querySelector('.doctor-profile-field-value')?.innerText?.trim();
      if (val) fieldMap[c.innerText.trim()] = val;
    });
    return fieldMap;
  });
  console.log('Dr. Robert Chen Profile Data:', JSON.stringify(chenData, null, 2));

  const ss3Path = path.join(ARTIFACT_DIR, 'doctor_profile_03_unassigned_chen.png');
  await page.screenshot({ path: ss3Path, fullPage: false });
  console.log('Saved screenshot 3 to', ss3Path);

  // Navigate to Doctor Directory to verify real facility names in table/dropdown
  console.log('Navigating to Doctor Directory...');
  await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const ss4Path = path.join(ARTIFACT_DIR, 'doctor_profile_04_directory_list.png');
  await page.screenshot({ path: ss4Path, fullPage: false });
  console.log('Saved screenshot 4 to', ss4Path);

  await browser.close();
  console.log('All browser verification tests completed successfully!');
}

run().catch(e => {
  console.error('Test run failed:', e);
  process.exit(1);
});

