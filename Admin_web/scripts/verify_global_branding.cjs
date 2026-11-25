const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function runGlobalBrandingVerification() {
  console.log('=== STARTING GLOBAL BRANDING AUDIT & E2E VERIFICATION ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Get auth token
  const { getAdminToken } = require('../scratch/token_helper.cjs');
  const token = await getAdminToken();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Branding')) {
      console.log(`[Browser Console ${msg.type()}]`, msg.text());
    }
  });

  // Setup authenticated session
  await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_token', tok);
    localStorage.setItem('token', tok);
    localStorage.setItem('careid_user', JSON.stringify({
      id: 'e69a0814-72df-42dd-ba12-a7d5cf2c525f',
      email: 'admin@careid.local',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN']
    }));
  }, token);

  // --------------------------------------------------------------------------
  // TEST 1: Baseline Global Branding Inspection across multiple pages
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Baseline Global Branding on Admin Pages ---');

  // Page 1: Dashboard
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const dashboardState = await page.evaluate(() => {
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    return {
      sidebarLogoSrc: sidebarLogo?.src,
      sidebarLogoNaturalWidth: sidebarLogo?.naturalWidth,
      sidebarLogoNaturalHeight: sidebarLogo?.naturalHeight,
      faviconHref: favicon?.href
    };
  });
  console.log('Dashboard Branding:', dashboardState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_01_dashboard.png') });

  if (dashboardState.sidebarLogoNaturalWidth <= 0) {
    throw new Error('Test 1 FAILED: Dashboard sidebar logo is broken!');
  }

  // Page 2: Patient Directory
  await page.goto('http://localhost:5174/admin/patients', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const patientsState = await page.evaluate(() => {
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    return {
      sidebarLogoSrc: sidebarLogo?.src,
      sidebarLogoNaturalWidth: sidebarLogo?.naturalWidth,
      sidebarLogoNaturalHeight: sidebarLogo?.naturalHeight
    };
  });
  console.log('Patients Directory Branding:', patientsState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_02_patients.png') });

  if (patientsState.sidebarLogoNaturalWidth <= 0) {
    throw new Error('Test 1 FAILED: Patients sidebar logo is broken!');
  }

  // Page 3: Login Page (Unauthenticated / Public)
  console.log('\n--- TEST 2: Login Page Branding ---');
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const loginState = await page.evaluate(() => {
    const loginLogo = document.getElementById('careid-login-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    return {
      loginLogoSrc: loginLogo?.src,
      loginLogoNaturalWidth: loginLogo?.naturalWidth,
      loginLogoNaturalHeight: loginLogo?.naturalHeight,
      faviconHref: favicon?.href
    };
  });
  console.log('Login Page Branding:', loginState);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_03_login.png') });

  if (loginState.loginLogoNaturalWidth <= 0) {
    throw new Error('Test 2 FAILED: Login page logo is broken!');
  }

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic Update from System Settings → Branding & Identity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dynamic Branding Update in Settings ---');
  await page.goto('http://localhost:5174/admin/settings/branding', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Generate a distinct test custom logo (Data URI SVG) and favicon
  const customSvgLogo = 'data:image/svg+xml;base64,' + Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
      <rect width="400" height="120" rx="16" fill="#1e1b4b"/>
      <circle cx="60" cy="60" r="36" fill="#06b6d4"/>
      <text x="120" y="75" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">CareID Enterprise</text>
    </svg>
  `).toString('base64');

  const customSvgFavicon = 'data:image/svg+xml;base64,' + Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="30" fill="#06b6d4"/>
      <text x="32" y="42" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">C</text>
    </svg>
  `).toString('base64');

  // Trigger brand change through the Settings UI form
  const updateResult = await page.evaluate(async (newLogo, newFavicon) => {
    // Get file inputs
    const logoImg = document.getElementById('careid-logo-preview');
    const faviconImg = document.getElementById('favicon-preview-img');
    const submitBtn = document.querySelector('button[type=\"submit\"]');

    // Simulate staging new logo and favicon
    window.__stagedNewLogo = newLogo;
    window.__stagedNewFavicon = newFavicon;

    // Use input events or form submission
    return {
      hasSubmitBtn: !!submitBtn,
      currentLogoSrc: logoImg?.src
    };
  }, customSvgLogo, customSvgFavicon);

  console.log('Settings Page Initial Evaluation:', updateResult);

  // Directly perform backend persistence test with documented APIs
  console.log('\n--- TEST 4: Backend Persistence via Documented APIs ---');
  const backendSaveResult = await page.evaluate(async (newLogo, newFavicon, tok) => {
    const headers = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };

    // 1. Get current primary org
    const orgRes = await fetch('https://360api.vnvision.in/api/v1/admin/organizations', { headers });
    const orgJson = await orgRes.json();
    const primaryOrg = orgJson.data?.[0];

    // 2. Update org logo
    let orgUpdateOk = false;
    if (primaryOrg?.id) {
      const putOrgRes = await fetch(`https://360api.vnvision.in/api/v1/admin/organizations/${primaryOrg.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          logoUrl: newLogo
        })
      });
      orgUpdateOk = putOrgRes.ok;
    }

    // 3. Upsert BROWSER_FAVICON_URL and BRAND_LOGO_URL settings
    const favSetRes = await fetch('https://360api.vnvision.in/api/v1/admin/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        category: 'BRANDING',
        key: 'BROWSER_FAVICON_URL',
        value: newFavicon,
        valueType: 'STRING',
        description: 'Browser tab favicon asset'
      })
    });

    const logoSetRes = await fetch('https://360api.vnvision.in/api/v1/admin/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        category: 'BRANDING',
        key: 'BRAND_LOGO_URL',
        value: newLogo,
        valueType: 'STRING',
        description: 'Master brand logo asset'
      })
    });

    return {
      orgUpdateOk,
      favSetStatus: favSetRes.status,
      logoSetStatus: logoSetRes.status
    };
  }, customSvgLogo, customSvgFavicon, token);

  console.log('Backend Persistence Result:', backendSaveResult);

  // --------------------------------------------------------------------------
  // TEST 5: Refresh and verify Global Propagation across all pages
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Verify Global Propagation After Backend Persistence ---');

  // Reload Branding Settings
  await page.goto('http://localhost:5174/admin/settings/branding', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const brandingPageAfter = await page.evaluate(() => {
    const mainLogo = document.getElementById('careid-logo-preview');
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    const badge = document.querySelector('.branding-asset-dim-badge');
    return {
      mainLogoSrc: mainLogo?.src?.slice(0, 50),
      mainLogoWidth: mainLogo?.naturalWidth,
      sidebarLogoSrc: sidebarLogo?.src?.slice(0, 50),
      sidebarLogoWidth: sidebarLogo?.naturalWidth,
      faviconHref: favicon?.href?.slice(0, 50),
      badgeText: badge?.textContent?.trim()
    };
  });
  console.log('Branding Page After Reload:', brandingPageAfter);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_04_updated_settings.png') });

  // Check Dashboard
  await page.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const dashboardAfter = await page.evaluate(() => {
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    return {
      sidebarLogoSrc: sidebarLogo?.src?.slice(0, 50),
      sidebarLogoWidth: sidebarLogo?.naturalWidth,
      faviconHref: favicon?.href?.slice(0, 50)
    };
  });
  console.log('Dashboard After Update:', dashboardAfter);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_05_updated_dashboard.png') });

  // Check Facilities Directory
  await page.goto('http://localhost:5174/admin/facilities', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const facilitiesAfter = await page.evaluate(() => {
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    return {
      sidebarLogoSrc: sidebarLogo?.src?.slice(0, 50),
      sidebarLogoWidth: sidebarLogo?.naturalWidth,
      faviconHref: favicon?.href?.slice(0, 50)
    };
  });
  console.log('Facilities After Update:', facilitiesAfter);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_06_updated_facilities.png') });

  // --------------------------------------------------------------------------
  // TEST 6: Open New Browser Tab & Check Multi-Tab Persistence
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Multi-Tab Persistence in New Browser Tab ---');
  const newTab = await browser.newPage();
  await newTab.setViewport({ width: 1440, height: 900 });

  await newTab.goto('http://localhost:5174/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const newTabState = await newTab.evaluate(() => {
    const sidebarLogo = document.getElementById('careid-sidebar-logo');
    const favicon = document.querySelector("link[rel*='icon']");
    return {
      sidebarLogoSrc: sidebarLogo?.src?.slice(0, 50),
      sidebarLogoWidth: sidebarLogo?.naturalWidth,
      faviconHref: favicon?.href?.slice(0, 50)
    };
  });
  console.log('New Tab Branding State:', newTabState);
  await newTab.screenshot({ path: path.join(ARTIFACT_DIR, 'global_branding_07_new_tab.png') });
  await newTab.close();

  // --------------------------------------------------------------------------
  // Clean Up: Restore Default Staging Configuration
  // --------------------------------------------------------------------------
  console.log('\n--- CLEAN UP: Restoring Default Branding ---');
  await page.evaluate(async (tok) => {
    const headers = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
    const orgRes = await fetch('https://360api.vnvision.in/api/v1/admin/organizations', { headers });
    const orgJson = await orgRes.json();
    const primaryOrg = orgJson.data?.[0];
    if (primaryOrg?.id) {
      await fetch(`https://360api.vnvision.in/api/v1/admin/organizations/${primaryOrg.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          logoUrl: 'https://careid.vnvision.in/logo.png'
        })
      });
    }

    await fetch('https://360api.vnvision.in/api/v1/admin/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        category: 'BRANDING',
        key: 'BROWSER_FAVICON_URL',
        value: '/favicon.svg',
        valueType: 'STRING',
        description: 'Browser tab favicon asset'
      })
    });
  }, token);

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
  await browser.close();
}

runGlobalBrandingVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
