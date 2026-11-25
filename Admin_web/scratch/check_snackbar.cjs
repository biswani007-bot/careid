const puppeteer = require('puppeteer');
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

async function check() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
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

  await page.goto('http://localhost:5173/admin/doctors/create', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#firstName', { timeout: 15000 });
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

  await page.evaluate(() => {
    const sel = document.querySelector('#hospital');
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 1500));

  const snackbar = await page.evaluate(() => {
    const el = document.querySelector('.action-snackbar-message, .action-snackbar, .users-toast, .snackbar-message');
    return el ? el.textContent.trim() : 'None found';
  });
  console.log('Rendered snackbar message:', snackbar);

  await browser.close();
}

check().catch(console.error);
