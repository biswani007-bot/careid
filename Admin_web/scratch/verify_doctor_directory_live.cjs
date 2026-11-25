const fs = require('fs');
const path = require('path');
const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TOKEN_CACHE_FILE = path.join(ARTIFACT_DIR, 'scratch/cached_token.json');

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('=== Running Live Backend Verification for Doctor Directory ===');
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Prime session in localStorage
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken }) => {
    const user = {
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      email: 'superadmin@careid.test',
      phone: '+16505550001',
      status: 'ACTIVE',
      roles: ['SUPER_ADMIN'],
      permissions: ['read:all', 'write:all', 'manage:roles']
    };
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(user));
    localStorage.setItem('careid_remember_me', 'true');
  }, tokenData);

  // 1. Navigate to /admin/doctors
  console.log('\n1. Navigating to /admin/doctors...');
  await page.goto(`${BASE_URL}/admin/doctors`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Verify KPIs
  const kpiValues = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.doctors-kpi-card'));
    return cards.map(c => ({
      label: c.querySelector('.doctors-kpi-label')?.innerText.trim(),
      val: c.querySelector('.doctors-kpi-value')?.innerText.trim()
    }));
  });
  console.log('Live KPIs displayed on page:', kpiValues);

  // Verify Doctor rows in Table
  const tableRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.doctors-table tbody tr'));
    return rows.map(r => ({
      name: r.querySelector('.doctors-doctor-name')?.innerText.trim(),
      hvid: r.querySelector('.doctors-doctor-hvid')?.innerText.trim(),
      license: r.querySelector('.doctors-doctor-license')?.innerText.trim(),
      specialty: r.querySelector('.doctors-doctor-specialty')?.innerText.trim(),
      status: r.querySelector('.doctors-status-badge')?.innerText.trim()
    })).filter(r => r.name);
  });
  console.log(`Live Table Rows (${tableRows.length} doctors found):`, tableRows);

  // Check if any mock/fake doctors appear
  const hasMockDoctors = tableRows.some(r => 
    r.name.includes('Chang') || r.name.includes('Thorne') || r.name.includes('Foster') || r.name.includes('Rostova') || r.name.includes('Sterling')
  );
  console.log('Contains hardcoded/mock doctors:', hasMockDoctors ? 'FAIL (Mock found!)' : 'PASS (0 mock doctors)');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doctors_live_table.png') });
  console.log('✓ Saved screenshot: verify_doctors_live_table.png');

  // 2. Test Search for "Vance"
  console.log('\n2. Testing Search for "Vance"...');
  await page.type('.patients-header-search-input', 'Vance');
  await new Promise(r => setTimeout(r, 1500));
  const searchResults = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.doctors-table tbody tr .doctors-doctor-name')).map(el => el.innerText.trim());
  });
  console.log('Search "Vance" results:', searchResults);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doctors_search_vance.png') });

  // Clear Search
  await page.evaluate(() => {
    const input = document.querySelector('.patients-header-search-input');
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1500));

  // 3. Test Filter Tab: Pending
  console.log('\n3. Testing "Pending" Filter Tab...');
  const pendingTab = await page.$('.doctors-pill:nth-child(3)');
  if (pendingTab) {
    await pendingTab.click();
    await new Promise(r => setTimeout(r, 1200));
    const pendingRows = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-table tbody tr .doctors-doctor-name')).map(el => el.innerText.trim());
    });
    console.log('Pending Doctors displayed:', pendingRows);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doctors_filter_pending.png') });
  }

  // 4. Test Filter Tab: Suspended (Expected: Empty state since 0 suspended)
  console.log('\n4. Testing "Suspended" Filter Tab (Expected empty state)...');
  const suspendedTab = await page.$('.doctors-pill:nth-child(4)');
  if (suspendedTab) {
    await suspendedTab.click();
    await new Promise(r => setTimeout(r, 1200));
    const emptyStateText = await page.evaluate(() => {
      const card = document.querySelector('.doctors-empty-card');
      return card ? card.innerText.replace(/\n/g, ' ') : null;
    });
    console.log('Empty state displayed for Suspended:', emptyStateText);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doctors_empty_state.png') });
  }

  // Reset to All
  const allTab = await page.$('.doctors-pill:nth-child(1)');
  if (allTab) {
    await allTab.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  // 5. Test Dropdowns: Specialties & Hospitals
  console.log('\n5. Testing Dropdowns...');
  const specBtn = await page.$('.doctors-dropdown-wrap:nth-child(1) .doctors-dropdown-btn');
  if (specBtn) {
    await specBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const specs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-dropdown-menu button')).map(b => b.innerText.trim());
    });
    console.log('Specialties options:', specs);
    await specBtn.click(); // close
  }

  const hospBtn = await page.$('.doctors-dropdown-wrap:nth-child(2) .doctors-dropdown-btn');
  if (hospBtn) {
    await hospBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const hosps = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-dropdown-menu button')).map(b => b.innerText.trim());
    });
    console.log('Hospitals options:', hosps);
    await hospBtn.click(); // close
  }

  // 6. Test Kebab Action Menu on First Row
  console.log('\n6. Testing Kebab Action Menu on First Doctor Row...');
  const firstKebab = await page.$('.doctors-action-btn');
  if (firstKebab) {
    await firstKebab.click();
    await new Promise(r => setTimeout(r, 600));
    const menuItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.doctors-row-menu-item')).map(b => b.innerText.trim());
    });
    console.log('Kebab menu actions available:', menuItems);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_doctors_kebab_actions.png') });
  }

  // 7. Responsive Viewports
  console.log('\n7. Testing Responsive Viewports...');
  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'laptop_1366', width: 1366, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_375', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 600));
    const file = `verify_doctors_${vp.name}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_DIR, file) });
    console.log(`✓ Saved ${vp.name} screenshot: ${file}`);
  }

  await browser.close();
  console.log('\n=== Live Doctor Directory Verification Completed Successfully ===');
}

run().catch(console.error);
