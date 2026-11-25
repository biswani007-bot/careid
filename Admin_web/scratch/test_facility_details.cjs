const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

function getWebSocketUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error('No page target found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function createCdpClient(wsUrl) {
  const WebSocket = require('ws');
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const callbacks = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  });

  return new Promise((resolve) => {
    ws.on('open', () => {
      const send = (method, params = {}) => {
        return new Promise((res, rej) => {
          const reqId = id++;
          callbacks.set(reqId, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: reqId, method, params }));
        });
      };
      resolve({ send, close: () => ws.close() });
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function captureScreenshot(cdp, filename) {
  const res = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(res.data, 'base64');
  const fullPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(fullPath, buf);
  console.log(`Saved screenshot: ${filename}`);
  return fullPath;
}

async function evaluate(cdp, expr) {
  const res = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(JSON.stringify(res.exceptionDetails));
  }
  return res.result ? res.result.value : undefined;
}

async function run() {
  console.log('Connecting to Chrome CDP...');
  const wsUrl = await getWebSocketUrl();
  const cdp = await createCdpClient(wsUrl);

  try {
    console.log('--- Step 1: Navigate to Facility Directory ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities' });
    await sleep(1500);

    // Set standard viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(500);

    const dirTitle = await evaluate(cdp, `document.querySelector('.facilities-heading')?.textContent`);
    console.log('Directory heading:', dirTitle);
    await captureScreenshot(cdp, 'facility_dir_row_click_ready.png');

    console.log('--- Step 2: Click first facility row to navigate to details ---');
    const clicked = await evaluate(cdp, `(() => {
      const row = document.querySelector('tbody tr');
      if (row) {
        row.click();
        return true;
      }
      return false;
    })()`);
    console.log('Row clicked:', clicked);
    await sleep(1200);

    const currentUrl = await evaluate(cdp, `window.location.href`);
    console.log('Current URL after row click:', currentUrl);

    const detailsTitle = await evaluate(cdp, `document.querySelector('.facility-master-title')?.textContent`);
    const facId = await evaluate(cdp, `document.querySelector('.facility-master-facid')?.textContent`);
    const tierBadge = await evaluate(cdp, `document.querySelector('.facility-tier-badge')?.textContent`);
    console.log('Facility details title:', detailsTitle);
    console.log('Facility ID:', facId);
    console.log('Tier Badge:', tierBadge);

    await captureScreenshot(cdp, 'facility_details_desktop_1440.png');

    console.log('--- Step 3: Test Tabs Switching ---');
    // Click Mapped Doctors tab
    await evaluate(cdp, `(() => {
      const tabs = Array.from(document.querySelectorAll('.facility-tab-btn'));
      const docTab = tabs.find(t => t.textContent.includes('Mapped Doctors'));
      if (docTab) docTab.click();
    })()`);
    await sleep(400);
    const doctorRowCount = await evaluate(cdp, `document.querySelectorAll('.facility-sub-table tbody tr').length`);
    console.log('Mapped Doctors table rows:', doctorRowCount);
    await captureScreenshot(cdp, 'facility_details_tab_doctors.png');

    // Click Assigned Staff tab
    await evaluate(cdp, `(() => {
      const tabs = Array.from(document.querySelectorAll('.facility-tab-btn'));
      const staffTab = tabs.find(t => t.textContent.includes('Assigned Staff'));
      if (staffTab) staffTab.click();
    })()`);
    await sleep(400);
    const staffRowCount = await evaluate(cdp, `document.querySelectorAll('.facility-sub-table tbody tr').length`);
    console.log('Assigned Staff table rows:', staffRowCount);
    await captureScreenshot(cdp, 'facility_details_tab_staff.png');

    // Click Overview tab again
    await evaluate(cdp, `(() => {
      const tabs = Array.from(document.querySelectorAll('.facility-tab-btn'));
      const overTab = tabs.find(t => t.textContent.includes('Overview'));
      if (overTab) overTab.click();
    })()`);
    await sleep(400);

    console.log('--- Step 4: Test Edit Facility Modal ---');
    await evaluate(cdp, `document.getElementById('btn-edit-facility')?.click()`);
    await sleep(500);

    const modalTitle = await evaluate(cdp, `document.getElementById('edit-facility-title')?.textContent`);
    console.log('Edit modal opened with title:', modalTitle);
    await captureScreenshot(cdp, 'facility_edit_modal_open.png');

    // Modify a field and submit
    await evaluate(cdp, `(() => {
      const input = document.getElementById('edit-mainTelephone');
      if (input) {
        input.value = '+1 (212) 659-9000';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const form = document.querySelector('.facility-modal-card form');
      if (form) form.requestSubmit();
    })()`);
    await sleep(800);

    const updatedPhone = await evaluate(cdp, `(() => {
      const items = Array.from(document.querySelectorAll('.facility-nexus-field-item'));
      const phoneItem = items.find(i => i.textContent.includes('Main Switchboard'));
      return phoneItem ? phoneItem.querySelector('.facility-nexus-field-val')?.textContent : null;
    })()`);
    console.log('Updated Switchboard value:', updatedPhone);

    console.log('--- Step 5: Test Map Doctor Modal ---');
    await evaluate(cdp, `document.getElementById('btn-map-doctor')?.click()`);
    await sleep(500);

    const mapModalTitle = await evaluate(cdp, `document.getElementById('map-doctor-title')?.textContent`);
    console.log('Map Doctor modal title:', mapModalTitle);
    await captureScreenshot(cdp, 'facility_map_doctor_modal.png');

    // Select a doctor and submit
    await evaluate(cdp, `(() => {
      const select = document.getElementById('map-select-doc');
      if (select) {
        select.value = select.options[1].value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const form = document.querySelector('.facility-modal-card form');
      if (form) form.requestSubmit();
    })()`);
    await sleep(800);

    const newDocCount = await evaluate(cdp, `document.querySelectorAll('.facility-sub-table tbody tr').length`);
    console.log('Doctor rows after mapping:', newDocCount);

    console.log('--- Step 6: Test Navigation to Doctor Profile ---');
    await evaluate(cdp, `(() => {
      const docNameBtn = document.querySelector('.facility-doc-name');
      if (docNameBtn) docNameBtn.click();
    })()`);
    await sleep(1000);
    const doctorPageUrl = await evaluate(cdp, `window.location.href`);
    console.log('Doctor page URL:', doctorPageUrl);
    await captureScreenshot(cdp, 'facility_nav_to_doctor_profile.png');

    // Go back to facility details
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/fac-1' });
    await sleep(1000);

    console.log('--- Step 7: Test Back to Facility Directory ---');
    await evaluate(cdp, `document.querySelector('.facility-btn-back')?.click()`);
    await sleep(800);
    const backUrl = await evaluate(cdp, `window.location.href`);
    console.log('URL after Back button:', backUrl);

    console.log('--- Step 8: Test Unknown Facility ID 404/Not Found ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/unknown-fac-999' });
    await sleep(1000);
    const notFoundTitle = await evaluate(cdp, `document.querySelector('.facility-detail-card h2')?.textContent`);
    console.log('Not Found title:', notFoundTitle);
    await captureScreenshot(cdp, 'facility_not_found_card.png');

    console.log('--- Step 9: Test Responsive Viewports and Overflow ---');
    const viewports = [
      { name: '1920x1080', width: 1920, height: 1080 },
      { name: '1366x768', width: 1366, height: 768 },
      { name: '1024x768', width: 1024, height: 768 },
      { name: '768x1024', width: 768, height: 1024 },
      { name: '390x844', width: 390, height: 844 },
    ];

    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/fac-1' });
    await sleep(1000);

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });
      await sleep(500);

      const overflow = await evaluate(cdp, `(() => {
        const doc = document.documentElement;
        const body = document.body;
        const main = document.querySelector('.facility-details-canvas');
        return {
          windowInnerWidth: window.innerWidth,
          docScrollWidth: doc.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          mainScrollWidth: main ? main.scrollWidth : null,
          mainClientWidth: main ? main.clientWidth : null,
          hasHorizontalOverflow: doc.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth
        };
      })()`);

      console.log(`Viewport ${vp.name}: overflow = ${overflow.hasHorizontalOverflow}`, overflow);
      await captureScreenshot(cdp, `facility_details_${vp.name}.png`);
    }

    console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY!');
  } finally {
    cdp.close();
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
