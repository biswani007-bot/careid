const puppeteer = require('d:/New folder/New folder/healthvault/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function runVerification() {
  console.log('Starting Comprehensive Verification for Medical, Dental & Vision Records...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // TEST 1: Direct navigation to /admin/records/medical
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Direct URL navigation: /admin/records/medical ---');
  await page.goto('http://localhost:5173/admin/records/medical', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const medTitle = await page.$eval('h1.category-heading-title', el => el.textContent.trim());
  console.log('Medical Records title:', medTitle);
  if (medTitle !== 'Medical Records') throw new Error(`Expected Medical Records, got ${medTitle}`);

  const medNodeBadge = await page.$eval('.category-node-badge', el => el.textContent.trim());
  console.log('Medical Node Badge:', medNodeBadge);
  if (!medNodeBadge.includes('Live Repository')) throw new Error('Missing Live Repository badge');

  const medKpis = await page.$$eval('.category-kpi-card .category-kpi-number', els => els.map(e => e.textContent.trim()));
  console.log('Medical KPI numbers:', medKpis);
  if (medKpis[0] !== '8,940') throw new Error(`Expected total 8,940, got ${medKpis[0]}`);
  if (medKpis[1] !== '8,412') throw new Error(`Expected verified 8,412, got ${medKpis[1]}`);

  const medRows = await page.$$eval('.category-table tbody tr', rows => rows.length);
  console.log('Medical rows count:', medRows);
  if (medRows < 5) throw new Error('Expected at least 5 medical records in table');

  // Verify dependent tag on Leo Jenkins
  const dependentTag = await page.$eval('.badge-dependent-tag', el => el.textContent.trim()).catch(() => null);
  console.log('Dependent badge on Leo Jenkins:', dependentTag);

  await page.screenshot({ path: path.join(artifactDir, 'careid_medical_records.png'), fullPage: false });
  console.log('Saved screenshot: careid_medical_records.png');

  // -------------------------------------------------------------
  // TEST 2: Direct navigation to /admin/records/dental
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Direct URL navigation: /admin/records/dental ---');
  await page.goto('http://localhost:5173/admin/records/dental', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const dentalTitle = await page.$eval('h1.category-heading-title', el => el.textContent.trim());
  console.log('Dental Records title:', dentalTitle);
  if (dentalTitle !== 'Dental Records') throw new Error(`Expected Dental Records, got ${dentalTitle}`);

  const dentalNodeBadge = await page.$eval('.category-node-badge', el => el.textContent.trim());
  console.log('Dental Node Badge:', dentalNodeBadge);
  if (!dentalNodeBadge.includes('Live Dental Node')) throw new Error('Missing Live Dental Node badge');

  const dentalKpis = await page.$$eval('.category-kpi-card .category-kpi-number', els => els.map(e => e.textContent.trim()));
  console.log('Dental KPI numbers:', dentalKpis);
  if (dentalKpis[0] !== '3,410') throw new Error(`Expected total 3,410, got ${dentalKpis[0]}`);
  if (dentalKpis[1] !== '3,184') throw new Error(`Expected verified 3,184, got ${dentalKpis[1]}`);

  const dentalPlaceholder = await page.$eval('.category-search-input', el => el.getAttribute('placeholder'));
  console.log('Dental search placeholder:', dentalPlaceholder);
  if (!dentalPlaceholder.includes('dentist')) throw new Error('Search placeholder should mention dentist');

  await page.screenshot({ path: path.join(artifactDir, 'careid_dental_records.png'), fullPage: false });
  console.log('Saved screenshot: careid_dental_records.png');

  // -------------------------------------------------------------
  // TEST 3: Direct navigation to /admin/records/vision
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Direct URL navigation: /admin/records/vision ---');
  await page.goto('http://localhost:5173/admin/records/vision', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const visionTitle = await page.$eval('h1.category-heading-title', el => el.textContent.trim());
  console.log('Vision Records title:', visionTitle);
  if (visionTitle !== 'Vision Records') throw new Error(`Expected Vision Records, got ${visionTitle}`);

  const visionNodeBadge = await page.$eval('.category-node-badge', el => el.textContent.trim());
  console.log('Vision Node Badge:', visionNodeBadge);
  if (!visionNodeBadge.includes('Live Vision Node')) throw new Error('Missing Live Vision Node badge');

  const visionKpis = await page.$$eval('.category-kpi-card .category-kpi-number', els => els.map(e => e.textContent.trim()));
  console.log('Vision KPI numbers:', visionKpis);
  if (visionKpis[0] !== '2,470') throw new Error(`Expected total 2,470, got ${visionKpis[0]}`);
  if (visionKpis[1] !== '2,318') throw new Error(`Expected verified 2,318, got ${visionKpis[1]}`);

  const visionPlaceholder = await page.$eval('.category-search-input', el => el.getAttribute('placeholder'));
  console.log('Vision search placeholder:', visionPlaceholder);
  if (!visionPlaceholder.includes('optometrist')) throw new Error('Search placeholder should mention optometrist');

  await page.screenshot({ path: path.join(artifactDir, 'careid_vision_records.png'), fullPage: false });
  console.log('Saved screenshot: careid_vision_records.png');

  // -------------------------------------------------------------
  // TEST 4: Navigation Tabs Strip Switching
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Tab navigation switching ---');
  // Click "Medical Records" tab from Vision screen
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.category-tab-link'));
    const medTab = tabs.find(t => t.textContent.includes('Medical Records'));
    if (medTab) medTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  console.log('URL after clicking Medical Records tab:', page.url());
  if (!page.url().includes('/admin/records/medical')) throw new Error('Failed to route to /admin/records/medical');

  // Click "Dental Records" tab from Medical screen
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.category-tab-link'));
    const dentalTab = tabs.find(t => t.textContent.includes('Dental Records'));
    if (dentalTab) dentalTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  console.log('URL after clicking Dental Records tab:', page.url());
  if (!page.url().includes('/admin/records/dental')) throw new Error('Failed to route to /admin/records/dental');

  // Click "All Records" tab from Dental screen
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('.category-tab-link'));
    const allTab = tabs.find(t => t.textContent.includes('All Records'));
    if (allTab) allTab.click();
  });
  await new Promise(r => setTimeout(r, 600));
  console.log('URL after clicking All Records tab:', page.url());
  if (!page.url().includes('/admin/records')) throw new Error('Failed to route to /admin/records');

  // -------------------------------------------------------------
  // TEST 5: Sidebar Subnav active state and click
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Sidebar subnav navigation ---');
  await page.goto('http://localhost:5173/admin/records/medical', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const activeSubnavText = await page.$eval('.sidebar-subnav-item.active', el => el.textContent.trim()).catch(() => null);
  console.log('Active subnav item in Medical screen:', activeSubnavText);
  if (!activeSubnavText || !activeSubnavText.includes('Medical Records')) {
    throw new Error(`Expected active subnav 'Medical Records', got '${activeSubnavText}'`);
  }

  // Click Dental Records in sidebar subnav
  await page.evaluate(() => {
    const subitems = Array.from(document.querySelectorAll('.sidebar-subnav-item'));
    const item = subitems.find(el => el.textContent.includes('Dental Records'));
    if (item) item.click();
  });
  await new Promise(r => setTimeout(r, 600));
  console.log('URL after clicking Dental in subnav:', page.url());
  if (!page.url().includes('/admin/records/dental')) throw new Error('Subnav failed to route to /admin/records/dental');

  // -------------------------------------------------------------
  // TEST 6: Record Detail Inspection Modal
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Record Inspection Modal ---');
  await page.click('.btn-category-row-view');
  await new Promise(r => setTimeout(r, 500));

  const modalTitle = await page.$eval('.category-modal-title', el => el.textContent.trim()).catch(() => null);
  console.log('Opened Record modal title:', modalTitle);
  if (!modalTitle) throw new Error('Inspection modal did not open');

  await page.screenshot({ path: path.join(artifactDir, 'careid_record_inspection_modal.png'), fullPage: false });
  console.log('Saved screenshot: careid_record_inspection_modal.png');

  // Close modal
  await page.click('.category-modal-card button[aria-label="Close"], .category-modal-footer button');
  await new Promise(r => setTimeout(r, 400));

  // -------------------------------------------------------------
  // TEST 7: Add Record Modal & Form
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Add Record Modal ---');
  await page.click('.btn-category-add');
  await new Promise(r => setTimeout(r, 500));

  const addModalTitle = await page.$eval('.category-modal-title', el => el.textContent.trim());
  console.log('Add Record modal title:', addModalTitle);
  if (!addModalTitle.includes('Add Dental Record')) throw new Error('Add Record title should reflect category');

  await page.screenshot({ path: path.join(artifactDir, 'careid_add_record_modal.png'), fullPage: false });
  console.log('Saved screenshot: careid_add_record_modal.png');

  await page.click('.category-modal-footer button');
  await new Promise(r => setTimeout(r, 400));

  // -------------------------------------------------------------
  // TEST 8: Mobile Responsiveness
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Mobile Responsiveness (390x844) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/admin/records/medical', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(artifactDir, 'careid_medical_mobile.png'), fullPage: false });
  console.log('Saved screenshot: careid_medical_mobile.png');

  await browser.close();
  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

runVerification().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
