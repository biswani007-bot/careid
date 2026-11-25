const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const token = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8')).accessToken;

async function run() {
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

  await page.goto('http://localhost:5173/admin/users', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.users-table', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Capture All Users
  const shotAll = path.join(ARTIFACT_DIR, 'admin_users_all.png');
  await page.screenshot({ path: shotAll, fullPage: true });
  console.log('Saved All Users screenshot:', shotAll);

  // 2. Click Doctors chip
  const buttons = await page.$$('.users-filter-chip');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent.trim(), btn);
    if (text === 'Doctors') {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  const shotDoctors = path.join(ARTIFACT_DIR, 'admin_users_doctors_chip.png');
  await page.screenshot({ path: shotDoctors, fullPage: true });
  console.log('Saved Doctors Chip screenshot:', shotDoctors);

  await browser.close();
}

run().catch(console.error);

