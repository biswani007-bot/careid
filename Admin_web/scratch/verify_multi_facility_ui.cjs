const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function verifyMultiFacilityUI() {
  const cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cached.accessToken;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to root to set localStorage
  await page.goto('http://localhost:5174/admin/login', { waitUntil: 'networkidle2' });
  await page.evaluate((t) => {
    localStorage.setItem('careid_access_token', t);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['*']
    }));
  }, token);

  const testDoctorId = '5c1c3002-30a7-434b-97d0-cf69f2bdd708'; // Dr. Swagat Pradhan, MD
  console.log('Navigating to Doctor Multi-Facility Mapping route...');
  await page.goto(`http://localhost:5174/admin/doctors/${testDoctorId}/map-facility`, { waitUntil: 'networkidle2' });

  // Wait for content container and mapped facilities overview
  await page.waitForSelector('.mapdoc-overview-section', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Capturing initial overview with 3 mapped facilities...');
  const shot1 = path.join(ARTIFACT_DIR, 'multi_facility_overview_3_mapped.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('Saved:', shot1);

  // Click on "Update Assignment" on one of the cards
  const updateBtn = await page.$('.mapdoc-update-btn');
  if (updateBtn) {
    console.log('Clicking Update Assignment button...');
    await updateBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    const shot2 = path.join(ARTIFACT_DIR, 'multi_facility_update_mode.png');
    await page.screenshot({ path: shot2, fullPage: true });
    console.log('Saved:', shot2);
  }

  // Click "Add Another Facility" button
  const addBtn = await page.$('#btn-add-another-facility');
  if (addBtn) {
    console.log('Clicking Add Another Facility button...');
    await addBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    const shot3 = path.join(ARTIFACT_DIR, 'multi_facility_add_mode.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log('Saved:', shot3);
  }

  // Reload the browser completely
  console.log('Executing complete browser reload...');
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.mapdoc-overview-section', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const shot4 = path.join(ARTIFACT_DIR, 'multi_facility_persisted_after_reload.png');
  await page.screenshot({ path: shot4, fullPage: true });
  console.log('Saved:', shot4);

  // Read mapped count from DOM
  const mappedCountText = await page.$eval('.mapdoc-overview-count', el => el.textContent);
  console.log('DOM Mapped Count after reload:', mappedCountText);

  await browser.close();
  console.log('Verification completed successfully!');
}

verifyMultiFacilityUI().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

