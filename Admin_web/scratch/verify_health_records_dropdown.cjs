const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser to test Health Records dropdown...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  // Load cached token for authenticated session
  const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = tokenData.token;

  console.log('Setting auth in localStorage...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('token', tok);
    localStorage.setItem('careid_user', JSON.stringify({
      id: 'bc6f6875-434c-4050-b893-07343cc27986',
      phone: '+16505550001',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  const artifactsDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

  // --- Step 1: Navigate to /admin/records ---
  console.log('\n--- Step 1: Navigating to /admin/records ---');
  await page.goto('http://localhost:5173/admin/records', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.careid-sidebar', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Check initial state: Health Records should be expanded
  let state = await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    const isExpanded = parentBtn?.getAttribute('aria-expanded') === 'true';
    const subnav = document.querySelector('#sidebar-records-subnav');
    return {
      isExpanded,
      subnavVisible: !!subnav,
      subnavText: subnav ? subnav.innerText.replace(/\n/g, ', ') : null
    };
  });
  console.log('Initial state on /admin/records:', state);
  if (!state.subnavVisible) throw new Error('Health Records should be expanded on /admin/records');

  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_1_initial.png') });

  // --- Step 2: Click Health Records once -> should collapse ---
  console.log('\n--- Step 2: Clicking Health Records to COLLAPSE ---');
  await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    parentBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  state = await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    const isExpanded = parentBtn?.getAttribute('aria-expanded') === 'true';
    const subnav = document.querySelector('#sidebar-records-subnav');
    return {
      isExpanded,
      subnavVisible: !!subnav
    };
  });
  console.log('After 1st click (collapse):', state);
  if (state.subnavVisible || state.isExpanded) throw new Error('Health Records failed to collapse!');

  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_2_collapsed.png') });

  // --- Step 3: Click Health Records again -> should expand ---
  console.log('\n--- Step 3: Clicking Health Records to EXPAND ---');
  await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    parentBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  state = await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    const isExpanded = parentBtn?.getAttribute('aria-expanded') === 'true';
    const subnav = document.querySelector('#sidebar-records-subnav');
    return {
      isExpanded,
      subnavVisible: !!subnav,
      subnavText: subnav ? subnav.innerText.replace(/\n/g, ', ') : null
    };
  });
  console.log('After 2nd click (expand):', state);
  if (!state.subnavVisible || !state.isExpanded) throw new Error('Health Records failed to re-expand!');

  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_3_reexpanded.png') });

  // --- Step 4: Click Medical Records -> navigate & verify active ---
  console.log('\n--- Step 4: Clicking Medical Records subnav item ---');
  await page.evaluate(() => {
    const medBtn = Array.from(document.querySelectorAll('.sidebar-subnav-item')).find(el => el.textContent.includes('Medical Records'));
    medBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  let navState = await page.evaluate(() => {
    const subnav = document.querySelector('#sidebar-records-subnav');
    const activeSub = document.querySelector('.sidebar-subnav-item.active');
    return {
      pathname: window.location.pathname,
      subnavVisible: !!subnav,
      activeItem: activeSub?.textContent?.trim()
    };
  });
  console.log('Navigated to Medical Records:', navState);
  if (navState.pathname !== '/admin/records/medical' || !navState.subnavVisible || navState.activeItem !== 'Medical Records') {
    throw new Error('Medical Records subnav navigation verification failed!');
  }
  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_4_medical.png') });

  // --- Step 5: Click Dental Records -> navigate & verify active ---
  console.log('\n--- Step 5: Clicking Dental Records subnav item ---');
  await page.evaluate(() => {
    const dentalBtn = Array.from(document.querySelectorAll('.sidebar-subnav-item')).find(el => el.textContent.includes('Dental Records'));
    dentalBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  navState = await page.evaluate(() => {
    const subnav = document.querySelector('#sidebar-records-subnav');
    const activeSub = document.querySelector('.sidebar-subnav-item.active');
    return {
      pathname: window.location.pathname,
      subnavVisible: !!subnav,
      activeItem: activeSub?.textContent?.trim()
    };
  });
  console.log('Navigated to Dental Records:', navState);
  if (navState.pathname !== '/admin/records/dental' || !navState.subnavVisible || navState.activeItem !== 'Dental Records') {
    throw new Error('Dental Records subnav navigation verification failed!');
  }
  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_5_dental.png') });

  // --- Step 6: Click Vision Records -> navigate & verify active ---
  console.log('\n--- Step 6: Clicking Vision Records subnav item ---');
  await page.evaluate(() => {
    const visBtn = Array.from(document.querySelectorAll('.sidebar-subnav-item')).find(el => el.textContent.includes('Vision Records'));
    visBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  navState = await page.evaluate(() => {
    const subnav = document.querySelector('#sidebar-records-subnav');
    const activeSub = document.querySelector('.sidebar-subnav-item.active');
    return {
      pathname: window.location.pathname,
      subnavVisible: !!subnav,
      activeItem: activeSub?.textContent?.trim()
    };
  });
  console.log('Navigated to Vision Records:', navState);
  if (navState.pathname !== '/admin/records/vision' || !navState.subnavVisible || navState.activeItem !== 'Vision Records') {
    throw new Error('Vision Records subnav navigation verification failed!');
  }
  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_6_vision.png') });

  // --- Step 7: Navigate to Dashboard -> Health Records should collapse ---
  console.log('\n--- Step 7: Navigating to Dashboard (/admin/dashboard) ---');
  await page.evaluate(() => {
    const dashBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Dashboard'));
    dashBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  state = await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    const isExpanded = parentBtn?.getAttribute('aria-expanded') === 'true';
    const subnav = document.querySelector('#sidebar-records-subnav');
    return {
      pathname: window.location.pathname,
      isExpanded,
      subnavVisible: !!subnav
    };
  });
  console.log('On Dashboard (Health Records collapsed?):', state);
  if (state.subnavVisible || state.isExpanded) {
    throw new Error('Health Records did not collapse when navigating to Dashboard!');
  }
  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_7_dashboard.png') });

  // --- Step 8: Navigate to Users -> Health Records should remain collapsed ---
  console.log('\n--- Step 8: Navigating to Users (/admin/users) ---');
  await page.evaluate(() => {
    const usersBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Users'));
    usersBtn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  state = await page.evaluate(() => {
    const parentBtn = Array.from(document.querySelectorAll('.sidebar-nav-item')).find(el => el.textContent.includes('Health Records'));
    const isExpanded = parentBtn?.getAttribute('aria-expanded') === 'true';
    const subnav = document.querySelector('#sidebar-records-subnav');
    return {
      pathname: window.location.pathname,
      isExpanded,
      subnavVisible: !!subnav
    };
  });
  console.log('On Users (Health Records collapsed?):', state);
  if (state.subnavVisible || state.isExpanded) {
    throw new Error('Health Records is not collapsed on Users!');
  }
  await page.screenshot({ path: path.join(artifactsDir, 'health_records_dropdown_8_users.png') });

  await browser.close();
  console.log('\nALL 8 VALIDATION STEPS PASSED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Error during validation:', err);
  process.exit(1);
});
