const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const cachedToken = JSON.parse(fs.readFileSync(path.join(__dirname, 'cached_token.json'), 'utf8'));

(async () => {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Set Auth token in localStorage using CareID keys
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle2' });
  await page.evaluate((token, refreshToken, user) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken || token);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
  }, cachedToken.accessToken, cachedToken.refreshToken, cachedToken.user);

  console.log('Navigating to http://localhost:5173/admin/doctors ...');
  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // Screenshot 1: Desktop Doctor Directory
  const desktopPath = path.join(ARTIFACT_DIR, 'doctor_directory_desktop_1440.png');
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log('Saved screenshot:', desktopPath);

  // Check KPI cards
  const kpiValues = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.doctors-kpi-card'));
    return cards.map(c => {
      const label = c.querySelector('.doctors-kpi-label')?.textContent?.trim();
      const val = c.querySelector('.doctors-kpi-value')?.textContent?.trim();
      const sub = c.querySelector('.text-\\[11px\\]')?.textContent?.trim();
      return { label, val, sub };
    });
  });
  console.log('Live KPI Values:', JSON.stringify(kpiValues, null, 2));

  // Check Doctor Rows
  const doctorRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    return rows.map(r => {
      const name = r.querySelector('.doctors-doctor-name')?.textContent?.trim();
      const hvid = r.querySelector('.doctors-doctor-hvid')?.textContent?.trim();
      const license = r.querySelector('.doctors-doctor-license')?.textContent?.trim();
      const status = r.querySelector('.doctors-status-badge')?.textContent?.trim();
      const specialty = r.querySelector('.doctors-doctor-specialty')?.textContent?.trim();
      return { name, hvid, license, status, specialty };
    }).filter(x => x.name);
  });
  console.log('Live Doctor Rows:', JSON.stringify(doctorRows, null, 2));

  // Open Kebab Menu on first doctor
  const kebabBtn = await page.$('.doctors-action-btn');
  if (kebabBtn) {
    await kebabBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const actionMenuPath = path.join(ARTIFACT_DIR, 'doctor_action_menu_1440.png');
    await page.screenshot({ path: actionMenuPath });
    console.log('Saved action menu screenshot:', actionMenuPath);

    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-row-menu-item')).map(b => b.textContent.trim());
    });
    console.log('Kebab Menu Items:', menuItems);
  }

  // Navigate to Doctor Profile for Dr. Julian Vance
  console.log('Navigating to Doctor Profile for Dr. Julian Vance...');
  await page.goto('http://localhost:5173/admin/doctors/7c8fd004-cba1-4a72-9db6-437fc6d2baed', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const profilePath = path.join(ARTIFACT_DIR, 'doctor_profile_desktop_1440.png');
  await page.screenshot({ path: profilePath, fullPage: true });
  console.log('Saved doctor profile screenshot:', profilePath);

  // Check Doctor Profile Timeline & Fields
  const profileDetails = await page.evaluate(() => {
    const name = document.querySelector('.doctor-profile-name')?.textContent?.trim();
    const specialty = document.querySelector('.doctor-profile-specialty')?.textContent?.trim();
    const status = document.querySelector('.doctor-profile-status-pill')?.textContent?.trim();
    const timeline = Array.from(document.querySelectorAll('.doctor-profile-timeline-step')).map(s => ({
      title: s.querySelector('.doctor-profile-timeline-step-title')?.textContent?.trim(),
      sub: s.querySelector('.doctor-profile-timeline-step-sub')?.textContent?.trim()
    }));
    return { name, specialty, status, timeline };
  });
  console.log('Doctor Profile Details:', JSON.stringify(profileDetails, null, 2));

  // Mobile Viewport Check
  console.log('Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/admin/doctors', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mobilePath = path.join(ARTIFACT_DIR, 'doctor_directory_mobile_390.png');
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log('Saved mobile screenshot:', mobilePath);

  await browser.close();
  console.log('All automated browser tests completed successfully!');
})().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
