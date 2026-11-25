const puppeteer = require('puppeteer');
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
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

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table', { timeout: 15000 });

  // Click Doctors chip
  const buttons = await page.$$('.users-filter-chip');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    if (text === 'Doctors') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const rows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('.users-table-row'));
    return trs.map(tr => {
      const name = tr.querySelector('.user-name')?.textContent?.trim();
      const hvid = tr.querySelector('.user-hvid')?.textContent?.trim();
      const role = tr.querySelector('.user-role-badge')?.textContent?.trim();
      const contact = tr.querySelector('.user-contact-box')?.textContent?.replace(/\s+/g, ' ').trim();
      const verification = tr.querySelector('.user-table-td:nth-child(5)')?.textContent?.trim();
      return { name, hvid, role, contact, verification };
    });
  });

  console.log('Doctors Tab Rows:');
  console.log(JSON.stringify(rows, null, 2));

  await browser.close();
}

run().catch(console.error);

