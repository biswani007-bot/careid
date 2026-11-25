const puppeteer = require('puppeteer');
const path = require('path');
const { getAdminToken } = require('./token_helper.cjs');

const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function main() {
  console.log('Retrieving admin token...');
  const token = await getAdminToken();
  console.log('Token acquired. Launching Puppeteer...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 }
  });

  const page = await browser.newPage();

  // Navigate to initial page to establish domain origin for localStorage
  await page.goto('http://localhost:5174/admin/facilities/3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', { waitUntil: 'domcontentloaded' });

  // Set auth tokens in localStorage
  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  // Reload page so apiClient picks up token
  console.log('Navigating to Metro General Hospital Facility Details...');
  await page.goto('http://localhost:5174/admin/facilities/3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', { waitUntil: 'networkidle0' });

  // Wait a moment for data to render
  await new Promise(r => setTimeout(r, 2000));

  // Find and click the Rooms & Suites tab
  console.log('Clicking Rooms & Suites tab...');
  const tabs = await page.$$('.facility-tab-btn');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.innerText, tab);
    if (text.includes('Rooms & Suites')) {
      await tab.click();
      console.log('Clicked Rooms & Suites tab:', text);
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 1: Rooms list
  const shot1 = path.join(ARTIFACT_DIR, 'facility_rooms_01_list.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved screenshot 1:', shot1);

  // Click "+ Add Room"
  console.log('Clicking "+ Add Room"...');
  const addBtn = await page.$('#btn-add-facility-room');
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Fill form
    const roomNum = 'RM-PUP-' + Math.floor(100 + Math.random() * 900);
    console.log('Filling form with roomNumber:', roomNum);
    await page.type('input[placeholder="e.g. RM-301 or ICU-04"]', roomNum);
    await page.type('input[placeholder="e.g. Cardiac Catheterization Suite"]', 'Cardiac Catheterization Lab 3');
    await page.type('input[placeholder="e.g. Main Hospital Tower"]', 'West Pavilion');
    await page.type('input[placeholder="e.g. Block A"]', 'Wing B');
    await page.type('input[placeholder="e.g. 3rd Floor"]', '4th Floor');

    // Submit form
    const submitBtn = await page.$('button[type="submit"].bg-\\[\\#28006d\\]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submitted create room form, waiting for response...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Screenshot 2: After room creation
  const shot2 = path.join(ARTIFACT_DIR, 'facility_rooms_02_created.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Saved screenshot 2:', shot2);

  // Click Edit or Delete to demonstrate Backend Dependency modal
  console.log('Triggering Backend Dependency modal via Edit button...');
  const editButtons = await page.$$('button[title*="Backend Dependency"]');
  if (editButtons.length > 0) {
    await editButtons[0].click();
    await new Promise(r => setTimeout(r, 1000));
  }

  // Screenshot 3: Backend dependency modal
  const shot3 = path.join(ARTIFACT_DIR, 'facility_rooms_03_backend_dependency.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Saved screenshot 3:', shot3);

  // Dismiss modal
  const dismissBtn = await page.$('.facility-modal-card button.bg-\\[\\#28006d\\]');
  if (dismissBtn) {
    await dismissBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // Navigate to facility with 0 rooms to verify genuine empty state
  console.log('Navigating to CareID Apex Diagnostic Center (0 rooms) to verify genuine empty state...');
  await page.goto('http://localhost:5174/admin/facilities/ffd6cadd-4a74-4129-86c0-35e643fd3205', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const apexTabs = await page.$$('.facility-tab-btn');
  for (const tab of apexTabs) {
    const text = await page.evaluate(el => el.innerText, tab);
    if (text.includes('Rooms & Suites')) {
      await tab.click();
      console.log('Clicked Rooms & Suites tab in Apex Diagnostic:', text);
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 4: Genuine empty state
  const shot4 = path.join(ARTIFACT_DIR, 'facility_rooms_04_empty_state.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log('Saved screenshot 4:', shot4);

  await browser.close();
  console.log('Puppeteer verification completed successfully!');
}

main().catch(err => {
  console.error('Puppeteer verification error:', err);
  process.exit(1);
});

