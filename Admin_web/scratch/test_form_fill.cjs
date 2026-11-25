const puppeteer = require('puppeteer');
const { getAdminToken } = require('./token_helper.cjs');

async function testFill() {
  const token = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('careid_user_session', JSON.stringify({ roles: ['SUPER_ADMIN'] }));
  }, token);

  await page.goto('http://localhost:5174/admin/doctors/create', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#firstName', { timeout: 10000 });

  function setReactInputValue(selector, value) {
    return page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, selector, value);
  }

  await page.type('#firstName', 'Clara');
  await page.type('#lastName', `Barton-${Date.now().toString().slice(-4)}`);
  await page.select('#gender', 'Female');
  await setReactInputValue('#dob', '1985-05-18');
  await page.type('#license', `MD-${Date.now().toString().slice(-6)}`);
  await page.type('#issuingBody', 'American Board of Internal Medicine');
  await setReactInputValue('#licenseExpiry', '2029-12-31');
  await page.type('#experienceYears', '15');
  await page.select('#specialty', 'Cardiology');
  await page.type('#subSpecialty', 'Electrophysiology');
  await page.type('#department', 'Department of Cardiology');
  await page.type('#officeNumber', 'Suite 502-B');
  await page.type('#email', `clara.barton.${Date.now().toString().slice(-4)}@careid.test`);
  await page.type('#phone', '+1 (650) 555-8832');

  // Select hospital
  await page.waitForFunction(() => {
    const sel = document.querySelector('#hospital');
    return sel && sel.options.length > 1;
  });
  const facId = await page.evaluate(() => {
    const sel = document.querySelector('#hospital');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.includes('-')) return sel.options[i].value;
    }
    return sel.options[1].value;
  });
  console.log('Selected facility:', facId);
  await page.select('#hospital', facId);

  // Click submit
  console.log('Clicking submit...');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => {
    const snack = document.querySelector('.user-action-snackbar');
    const errs = document.querySelectorAll('.add-doctor-error-msg');
    return snack || errs.length > 0;
  }, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const snack = document.querySelector('.user-action-snackbar');
    const errs = Array.from(document.querySelectorAll('.add-doctor-error-msg')).map(e => e.textContent);
    return {
      snackText: snack ? snack.textContent.trim() : null,
      errs
    };
  });
  console.log('Submission result:', result);

  await browser.close();
}

testFill().catch(console.error);
