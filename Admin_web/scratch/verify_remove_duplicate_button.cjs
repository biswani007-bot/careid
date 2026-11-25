const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { getFreshToken } = require('./api_helper.cjs');

(async () => {
  const token = await getFreshToken();

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/admin/login', { waitUntil: 'domcontentloaded' });
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

  const testDoctorId = '5c1c3002-30a7-434b-97d0-cf69f2bdd708';
  await page.goto('http://localhost:5174/admin/doctors/' + testDoctorId + '/map-facility', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.mapdoc-workspace-grid', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));

  // 1. Check if + Add Facility button exists
  const addBtn = await page.$('#btn-quick-add-facility');
  console.log('Is + Add Facility button present in Doctor Bar?:', Boolean(addBtn));

  // 2. Check Credentialed Facilities label and count
  const labelText = await page.$eval('.mapdoc-facilities-label', el => el.textContent.trim());
  console.log('Facilities Label in Doctor Bar:', labelText);

  // 3. Check mapped facility chips
  const chips = await page.$$eval('.mapdoc-facility-chip', els => els.map(e => e.textContent.trim()));
  console.log('Mapped Facility Chips:', chips);

  // 4. Click an unmapped facility in the table
  const unmappedRow = await page.$('tr.mapdoc-row:not(.selected)');
  if (unmappedRow) {
    await unmappedRow.click();
    await new Promise(r => setTimeout(r, 600));
    console.log('Selected an unmapped row in the directory.');
  }

  // 5. Verify Right drawer title & facility name
  const drawerTitle = await page.$eval('.mapdoc-drawer-title', el => el.textContent.trim());
  const selectedFacName = await page.$eval('.mapdoc-identity-name', el => el.textContent.trim());
  console.log('Right Drawer Title:', drawerTitle);
  console.log('Right Drawer Facility Name:', selectedFacName);

  // 6. Save verification screenshot
  const outPath = path.resolve('scratch/responsive_screenshots/mapdoc_no_duplicate_add_button.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved screenshot to:', outPath);

  await browser.close();
  console.log('Validation completed successfully!');
})();
