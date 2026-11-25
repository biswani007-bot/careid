const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';
const BASE_URL = 'http://localhost:5174';

async function verifyReferralFix() {
  const cachedAuth = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
  const token = cachedAuth.token || cachedAuth.accessToken;
  const refreshToken = cachedAuth.refreshToken;
  const userSession = {
    id: 'bc6f6875-434c-4050-b893-07343cc27986',
    email: 'superadmin@careid.test',
    phone: '+16505550001',
    status: 'ACTIVE',
    roles: ['SUPER_ADMIN'],
    permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs', 'manage:roles']
  };

  console.log(`Launching browser targeting ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Pre-seed localStorage with admin auth session
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, refreshToken, userSession }) => {
    localStorage.setItem('careid_access_token', token);
    localStorage.setItem('careid_refresh_token', refreshToken);
    localStorage.setItem('careid_user_session', JSON.stringify(userSession));
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', token);
    sessionStorage.setItem('careid_refresh_token', refreshToken);
    sessionStorage.setItem('careid_user_session', JSON.stringify(userSession));
  }, { token, refreshToken, userSession });

  console.log('1. Navigating to /admin/referrals...');
  await page.goto(`${BASE_URL}/admin/referrals`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 1: Overview table
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_1_overview_table.png'), fullPage: false });
  console.log('Saved referral_fix_1_overview_table.png');

  // Verify referral row exists
  const referralRowData = await page.evaluate(() => {
    const table = document.querySelector('.referral-table');
    const firstRowId = document.querySelector('.referral-cell-id button')?.innerText;
    const firstPatient = document.querySelector('.referral-cell-patient')?.innerText;
    const firstReferringDoc = document.querySelector('.referral-cell-doctor:nth-child(3)')?.innerText;
    return {
      hasTable: !!table,
      firstRowId,
      firstPatient,
      firstReferringDoc,
      fullTextSnippet: table ? table.innerText.slice(0, 300) : ''
    };
  });
  console.log('Table loaded evaluation:', referralRowData);

  // 2. Click the referral link to navigate to details
  console.log('2. Clicking first referral link in table...');
  const clicked = await page.evaluate(() => {
    const link = document.querySelector('.referral-cell-id button');
    if (link) {
      link.click();
      return true;
    }
    return false;
  });
  console.log('Referral button clicked:', clicked);

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 6000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));

  const currentUrl = page.url();
  console.log('Current URL after click:', currentUrl);

  // Check detail contents
  const detailContent = await page.evaluate(() => {
    return {
      title: document.querySelector('.referral-main-heading')?.innerText,
      breadcrumb: document.querySelector('.referral-breadcrumb-current')?.innerText,
      statusPill: document.querySelector('.referral-status-pill')?.innerText,
      patientName: document.querySelector('.referral-patient-name')?.innerText,
      healthVaultId: document.querySelector('[data-card="referral-information"] .referral-field-group:nth-child(2) .referral-field-value')?.innerText,
      referringDoc: document.querySelector('[data-card="referral-information"] .referral-field-group:nth-child(4) .referral-field-value')?.innerText,
      receivingDept: document.querySelector('[data-card="referral-information"] .referral-field-group:nth-child(5) .referral-field-value')?.innerText,
      clinicalReason: document.querySelector('.referral-reason-box')?.innerText,
      notesCount: document.querySelectorAll('.referral-note-bubble')?.length,
      firstNote: document.querySelector('.referral-note-content')?.innerText,
      timelineCount: document.querySelectorAll('.referral-timeline-item')?.length,
      firstTimelineTitle: document.querySelector('.referral-timeline-title')?.innerText,
      notFound: document.querySelector('.referral-empty-state-card')?.innerText,
    };
  });
  console.log('Detail page evaluation:', detailContent);

  // Screenshot 2: Referral Detail via UUID click
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_2_details_from_click.png'), fullPage: false });
  console.log('Saved referral_fix_2_details_from_click.png');

  // 3. Test direct navigation to legacy short code: /admin/referrals/REF-A85D02
  console.log('3. Testing direct access to /admin/referrals/REF-A85D02...');
  await page.goto(`${BASE_URL}/admin/referrals/REF-A85D02`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const legacyContent = await page.evaluate(() => {
    return {
      currentUrl: window.location.pathname,
      title: document.querySelector('.referral-main-heading')?.innerText,
      breadcrumb: document.querySelector('.referral-breadcrumb-current')?.innerText,
      patientName: document.querySelector('.referral-patient-name')?.innerText,
      notFound: document.querySelector('.referral-empty-state-card')?.innerText,
    };
  });
  console.log('Legacy URL evaluation:', legacyContent);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_3_details_from_legacy_code.png'), fullPage: false });
  console.log('Saved referral_fix_3_details_from_legacy_code.png');

  // 4. Test direct navigation to official referral number: /admin/referrals/REF-2026-00031
  console.log('4. Testing direct access to /admin/referrals/REF-2026-00031...');
  await page.goto(`${BASE_URL}/admin/referrals/REF-2026-00031`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const numberContent = await page.evaluate(() => {
    return {
      currentUrl: window.location.pathname,
      title: document.querySelector('.referral-main-heading')?.innerText,
      breadcrumb: document.querySelector('.referral-breadcrumb-current')?.innerText,
      patientName: document.querySelector('.referral-patient-name')?.innerText,
      notFound: document.querySelector('.referral-empty-state-card')?.innerText,
    };
  });
  console.log('Referral Number URL evaluation:', numberContent);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_4_details_from_number.png'), fullPage: false });
  console.log('Saved referral_fix_4_details_from_number.png');

  // 5. Click breadcrumb back to referrals list
  console.log('5. Clicking breadcrumb back to Referrals list...');
  await page.evaluate(() => {
    const breadcrumbLink = document.querySelector('.referral-breadcrumb-link');
    if (breadcrumbLink) breadcrumbLink.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  console.log('URL after back click:', page.url());
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'referral_fix_5_back_to_list.png'), fullPage: false });
  console.log('Saved referral_fix_5_back_to_list.png');

  await browser.close();
  console.log('Verification test completed successfully!');
}

verifyReferralFix().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
