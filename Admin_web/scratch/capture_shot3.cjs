const puppeteer = require('puppeteer');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

(async () => {
  const adminToken = await getAdminToken();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:5174/admin/doctors', { waitUntil: 'networkidle2' });
    await page.evaluate((token) => {
      localStorage.setItem('careid_access_token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('access_token', token);
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        roles: ['ADMIN']
      }));
    }, adminToken);

    await page.goto('http://localhost:5174/admin/doctors/create', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Fill form with duplicate registration
    await page.evaluate(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          if (desc && desc.set) desc.set.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      setVal('#firstName', 'Test');
      setVal('#lastName', 'DupReg');
      setVal('#gender', 'Male');
      setVal('#dob', '1985-01-01');
      setVal('#license', 'A-270251'); // This maps to MED-REG-A-270251 which exists
      setVal('#issuingBody', 'State Medical Board');
      setVal('#licenseExpiry', '2028-12-31');
      setVal('#experienceYears', '5');
      setVal('#specialty', 'Cardiology');
      setVal('#hospital', '40376382-5d29-4cde-9c6f-912319241022');
      setVal('#department', 'Cardiology');
      setVal('#officeNumber', '101');
      setVal('#email', 'unique.email.' + Date.now() + '@test.com');
      setVal('#phone', '+165099' + Date.now().toString().slice(-4));
    });

    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    const shot3Path = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/doctor_409_fix_03_duplicate_reg_conflict.png';
    await page.screenshot({ path: shot3Path });
    console.log('Saved shot 3 to', shot3Path);
  } finally {
    await browser.close();
  }
})();

