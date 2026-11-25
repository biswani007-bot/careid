const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Auth setup
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      phone: '+16505550001'
    }));
  }, token);

  // 2. Doctor Directory
  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const docDirShot = path.join(ARTIFACT_DIR, 'doctor_directory_verification.png');
  await page.screenshot({ path: docDirShot, fullPage: true });
  console.log('Saved doctor directory screenshot:', docDirShot);

  // 3. Add Doctor page
  await page.goto('http://localhost:5173/admin/doctors/add', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const addDocShot = path.join(ARTIFACT_DIR, 'add_doctor_form_verification.png');
  await page.screenshot({ path: addDocShot, fullPage: true });
  console.log('Saved add doctor form screenshot:', addDocShot);

  // 4. Fill Add Doctor Form and Submit to test real API error handling
  await page.type('#firstName', 'Alexander');
  await page.type('#lastName', 'Fleming');
  await page.select('#gender', 'Male');
  await page.type('#dob', '1980-05-15');
  await page.type('#license', 'PMC-REG-998877');
  await page.type('#issuingBody', 'State Medical Board');
  await page.type('#licenseExpiry', '2027-12-31');
  await page.type('#experienceYears', '15');
  await page.select('#specialty', 'Cardiology');
  await page.type('#department', 'Department of Cardiology');
  await page.type('#officeNumber', 'Room 304');
  await page.type('#email', 'afleming@hospital.org');
  await page.type('#phone', '+16505550088');

  // Select first facility if available
  const hasFacilityOptions = await page.evaluate(() => {
    const sel = document.querySelector('#hospital');
    return sel && sel.options.length > 1;
  });
  if (hasFacilityOptions) {
    await page.evaluate(() => {
      const sel = document.querySelector('#hospital');
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // Submit form
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 1500));
  }

  const addDocSubmitShot = path.join(ARTIFACT_DIR, 'add_doctor_submit_feedback.png');
  await page.screenshot({ path: addDocSubmitShot, fullPage: true });
  console.log('Saved add doctor submit feedback screenshot:', addDocSubmitShot);

  // 5. Patient Directory
  await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  const patDirShot = path.join(ARTIFACT_DIR, 'patient_directory_verification.png');
  await page.screenshot({ path: patDirShot, fullPage: true });
  console.log('Saved patient directory screenshot:', patDirShot);

  // Check table rows in Patient Directory
  const patientRows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('.patients-table-row'));
    return trs.map(tr => {
      const name = tr.querySelector('.patients-name')?.textContent?.trim();
      const vaultId = tr.querySelector('.patients-vault-id')?.textContent?.trim();
      const verification = tr.querySelector('.patients-badge-verification')?.textContent?.trim();
      const status = tr.querySelector('.patients-status-text')?.textContent?.trim();
      return { name, vaultId, verification, status };
    });
  });
  console.log('Patient Directory Table Rows:');
  console.log(JSON.stringify(patientRows, null, 2));

  await browser.close();
}

run().catch(console.error);

