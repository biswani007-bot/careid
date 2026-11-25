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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // Domain origin for localStorage
  await page.goto('http://localhost:5174/admin/facilities/3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', { waitUntil: 'domcontentloaded' });

  await page.evaluate((tok) => {
    localStorage.setItem('careid_access_token', tok);
    localStorage.setItem('careid_remember_me', 'true');
    sessionStorage.setItem('careid_access_token', tok);
  }, token);

  console.log('Navigating to Metro General Hospital Facility Details...');
  await page.goto('http://localhost:5174/admin/facilities/3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Click Rooms & Suites tab
  console.log('Navigating to Rooms tab...');
  const tabs = await page.$$('.facility-tab-btn');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.innerText, tab);
    if (text.includes('Rooms & Suites')) {
      await tab.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));

  // Click "+ Add Room"
  console.log('Opening Register New Facility Room modal...');
  const addBtn = await page.$('#btn-add-facility-room');
  if (addBtn) {
    await addBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // Measure modal width and input dimensions
  const modalBox = await page.evaluate(() => {
    const modal = document.querySelector('.facility-modal-card');
    const input = document.querySelector('#modal-room-number');
    const footer = document.querySelector('.facility-modal-footer');
    const cancelBtn = footer?.children[0];
    const submitBtn = footer?.children[1];
    return {
      modalWidth: modal?.offsetWidth,
      inputHeight: input?.offsetHeight,
      footerJustify: window.getComputedStyle(footer).justifyContent,
      cancelText: cancelBtn?.innerText,
      submitText: submitBtn?.innerText,
    };
  });
  console.log('Modal dimensions & alignment:', modalBox);

  // Trigger validation error by clearing fields and submitting empty
  console.log('Testing empty form validation...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 600));

  const shot1 = path.join(ARTIFACT_DIR, 'facility_room_modal_01_validation.png');
  await page.screenshot({ path: shot1 });
  console.log('Saved screenshot 1 (Validation Errors):', shot1);

  // Fill in form with duplicate room number RM-101 to test backend 409 conflict UI
  console.log('Testing conflict error with duplicate RM-101...');
  await page.type('#modal-room-number', 'RM-101');
  await page.type('#modal-room-name', 'Cardiac Cath Suite Duplicate');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2500));

  const shot2 = path.join(ARTIFACT_DIR, 'facility_room_modal_02_conflict_error.png');
  await page.screenshot({ path: shot2 });
  console.log('Saved screenshot 2 (Conflict 409 Error Alert):', shot2);

  // Fill with clean unique room data
  console.log('Filling form with clean unique data...');
  await page.click('#modal-room-number', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  const validRoomNum = 'RM-REDESIGN-' + Math.floor(100 + Math.random() * 900);
  await page.type('#modal-room-number', validRoomNum);

  await page.click('#modal-room-name', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('#modal-room-name', 'VIP Diagnostic Suite 5');

  await page.select('#modal-room-category', 'OPERATION_THEATRE');

  const shot3 = path.join(ARTIFACT_DIR, 'facility_room_modal_03_desktop_filled.png');
  await page.screenshot({ path: shot3 });
  console.log('Saved screenshot 3 (Desktop Filled Form):', shot3);

  // Test Tablet viewport (768x1024)
  console.log('Testing Tablet Viewport (768x1024)...');
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 800));
  const shot4 = path.join(ARTIFACT_DIR, 'facility_room_modal_04_tablet.png');
  await page.screenshot({ path: shot4 });
  console.log('Saved screenshot 4 (Tablet Viewport):', shot4);

  // Test Mobile viewport (375x812)
  console.log('Testing Mobile Viewport (375x812)...');
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 800));
  const shot5 = path.join(ARTIFACT_DIR, 'facility_room_modal_05_mobile.png');
  await page.screenshot({ path: shot5 });
  console.log('Saved screenshot 5 (Mobile Viewport):', shot5);

  // Submit valid form to ensure creation still works seamlessly
  console.log('Submitting valid form from mobile...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  // Return to desktop to verify newly registered room in the table
  await page.setViewport({ width: 1440, height: 960 });
  await new Promise(r => setTimeout(r, 1000));
  const shot6 = path.join(ARTIFACT_DIR, 'facility_room_modal_06_registered_success.png');
  await page.screenshot({ path: shot6 });
  console.log('Saved screenshot 6 (Created Room in Table):', shot6);

  await browser.close();
  console.log('All verification steps completed successfully!');
}

main().catch(err => {
  console.error('Puppeteer verification error:', err);
  process.exit(1);
});

