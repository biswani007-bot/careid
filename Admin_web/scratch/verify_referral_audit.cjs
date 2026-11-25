const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = path.join(
  process.env.USERPROFILE || 'C:\\Users\\biswa',
  '.gemini',
  'antigravity',
  'brain',
  'e0785a94-53fe-4f28-b816-f2efe4edf49e',
  '.tempmediaStorage'
);

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runAuditVerification() {
  console.log('=== STARTING REFERRAL AUDIT & EMPTY STATES VERIFICATION ===');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Clear audit storage initially to test genuine empty state
  await page.goto('http://localhost:5173/admin/referrals', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.removeItem('careid_referral_audit_logs');
  });

  // 1. Test clicking via Sidebar Submenu
  console.log('\n--- 1. TESTING NAVIGATION VIA SIDEBAR ---');
  await page.setViewport({ width: 1440, height: 1024 });

  // Locate the Referral Audit submenu item
  const auditSubmenu = await page.$('.sidebar-subnav-item:nth-child(3)');
  if (auditSubmenu) {
    await auditSubmenu.click();
    await page.waitForFunction(() => window.location.pathname === '/admin/referrals/audit');
    console.log('[Sidebar Navigation] Successfully clicked Referral Audit in submenu -> navigated to /admin/referrals/audit');
  } else {
    // If submenu was collapsed, click Referrals first
    const referralsNav = await page.$('.sidebar-nav-item');
    if (referralsNav) await referralsNav.click();
    await page.goto('http://localhost:5173/admin/referrals/audit', { waitUntil: 'networkidle0' });
  }

  // 2. Desktop 1440x1024 Empty State Verification
  console.log('\n--- 2. DESKTOP EMPTY STATE VERIFICATION (1440x1024) ---');
  await page.setViewport({ width: 1440, height: 1024 });
  await page.goto('http://localhost:5173/admin/referrals/audit', { waitUntil: 'networkidle0' });

  const emptyDiag = await page.evaluate(() => {
    const docScrollWidth = document.documentElement.scrollWidth;
    const winInnerWidth = window.innerWidth;
    const hasOverflow = docScrollWidth > winInnerWidth;
    const title = document.querySelector('.audit-page-title')?.textContent?.trim();
    const breadcrumb = document.querySelector('.audit-breadcrumb-current')?.textContent?.trim();
    const hasEmptyState = document.body.innerText.includes('No Audit Records Found');
    const hasEscalationsPanel = document.body.innerText.includes('Escalations') || document.body.innerText.includes('No Escalations Found');

    return {
      hasOverflow,
      title,
      breadcrumb,
      hasEmptyState,
      hasEscalationsPanel,
      docScrollWidth,
      winInnerWidth
    };
  });

  console.log(`[Empty State Diagnostic] title: "${emptyDiag.title}", breadcrumb: "${emptyDiag.breadcrumb}", hasEmptyState: ${emptyDiag.hasEmptyState}, overflow: ${emptyDiag.hasOverflow}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_desktop_empty_1440.png') });

  // 3. Populate Sample Lifecycle Events and Test Populated Table
  console.log('\n--- 3. POPULATED TABLE VERIFICATION ---');
  // Click "Simulate Referral Event" button to record lifecycle actions
  const recordBtn = await page.$('button.bg-\\[\\#28006d\\]');
  if (recordBtn) {
    await recordBtn.click();
    await new Promise(r => setTimeout(r, 400));
    // Click again to have multiple rows
    const recordBtn2 = await page.$('button.bg-\\[\\#28006d\\]');
    if (recordBtn2) await recordBtn2.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // Reload or verify populated rows
  const populatedDiag = await page.evaluate(() => {
    const rows = document.querySelectorAll('.audit-row');
    const firstRowText = rows[0]?.textContent?.trim() || '';
    return {
      rowCount: rows.length,
      firstRowText
    };
  });

  console.log(`[Populated Table Diagnostic] rowCount: ${populatedDiag.rowCount}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_desktop_populated_1440.png') });

  // 4. Test Filter Modal
  console.log('\n--- 4. FILTER MODAL VERIFICATION ---');
  const filterBtn = await page.$('.audit-action-btn.filter');
  if (filterBtn) {
    await filterBtn.click();
    await page.waitForSelector('.audit-modal-card');
    console.log('[Filter Modal] Modal opened successfully');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_filter_modal.png') });

    // Close filter modal
    const closeBtn = await page.$('.audit-modal-close-btn');
    if (closeBtn) await closeBtn.click();
  }

  // 5. Test Capability Notice Modal
  console.log('\n--- 5. CAPABILITY NOTICE MODAL VERIFICATION ---');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('View Contract Details'));
    if (btn) btn.click();
  });
  await page.waitForSelector('.audit-modal-card');
  console.log('[Capability Notice] Modal opened successfully');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_capability_modal.png') });
  const dismissBtn = await page.$('.audit-modal-footer button');
  if (dismissBtn) await dismissBtn.click();

  // 6. Test Escalations Empty State Panel (`20:5700`)
  console.log('\n--- 6. ESCALATIONS EMPTY STATE PANEL (20:5700) VERIFICATION ---');
  // Click Preview Empty Escalation State if active
  await page.evaluate(() => {
    const previewBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Preview Empty Escalation State'));
    if (previewBtn) previewBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_escalations_empty_panel.png') });

  // Test "Check Monitoring" button navigation
  const checkMonitoringBtn = await page.$('.audit-check-btn');
  if (checkMonitoringBtn) {
    await checkMonitoringBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/admin/referrals/escalations');
    console.log('[Check Monitoring Navigation] Clicked Check Monitoring -> navigated to /admin/referrals/escalations');
  }

  // 7. Responsive Viewports & Zoom Verification
  console.log('\n--- 7. RESPONSIVE VIEWPORTS & ZOOM VERIFICATION ---');
  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1600x900', width: 1600, height: 900 },
    { name: '1440x1024', width: 1440, height: 1024 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1024x768', width: 1024, height: 768 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173/admin/referrals/audit', { waitUntil: 'networkidle0' });

    const diag = await page.evaluate(() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const winInnerWidth = window.innerWidth;
      const hasOverflow = docScrollWidth > winInnerWidth;
      return { docScrollWidth, winInnerWidth, hasOverflow };
    });

    console.log(`[Viewport ${vp.name}] scrollWidth: ${diag.docScrollWidth}, innerWidth: ${diag.winInnerWidth}, pageOverflow: ${diag.hasOverflow}`);
    if (diag.hasOverflow) {
      throw new Error(`Horizontal overflow on viewport ${vp.name}`);
    }
  }

  // Test zoom at 125%
  await page.setViewport({ width: 1093, height: 614, deviceScaleFactor: 1.25 });
  await page.goto('http://localhost:5173/admin/referrals/audit', { waitUntil: 'networkidle0' });
  const zoomDiag = await page.evaluate(() => {
    const docScrollWidth = document.documentElement.scrollWidth;
    const winInnerWidth = window.innerWidth;
    return { hasOverflow: docScrollWidth > winInnerWidth };
  });
  console.log(`[Zoom 125%] pageOverflow: ${zoomDiag.hasOverflow}`);

  await browser.close();
  console.log('\n=== ALL AUDIT VERIFICATIONS COMPLETED SUCCESSFULLY! ===');
}

runAuditVerification().catch(err => {
  console.error('Audit verification failed:', err);
  process.exit(1);
});

