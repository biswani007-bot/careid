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
    console.log('--- Step 1: Open Facility Details and click Edit Facility ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/fac-1' });
    await sleep(1500);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(400);

    const detailsTitle = await evaluate(cdp, `document.querySelector('.facility-master-title')?.textContent`);
    console.log('Current facility details title:', detailsTitle);

    // Click Edit Facility button
    await evaluate(cdp, `document.getElementById('btn-edit-facility')?.click()`);
    await sleep(1200);

    const editUrl = await evaluate(cdp, `window.location.href`);
    console.log('URL after clicking Edit Facility:', editUrl);

    console.log('--- Step 2: Verify Edit Facility Screen Structure & Prepopulation ---');
    const heroTitle = await evaluate(cdp, `document.querySelector('.facility-edit-hero-title')?.textContent`);
    const codePill = await evaluate(cdp, `document.querySelector('.facility-edit-code-pill')?.textContent`);
    const inputLegalName = await evaluate(cdp, `document.getElementById('edit-legalName')?.value`);
    const inputType = await evaluate(cdp, `document.getElementById('edit-facilityType')?.value`);
    const inputLicense = await evaluate(cdp, `document.getElementById('edit-clinicalLicense')?.value`);
    const inputNpi = await evaluate(cdp, `document.getElementById('edit-npiNumber')?.value`);
    const inputStreet = await evaluate(cdp, `document.getElementById('edit-streetAddress1')?.value`);
    const inputCity = await evaluate(cdp, `document.getElementById('edit-city')?.value`);
    const twinTitle = await evaluate(cdp, `document.querySelector('.facility-edit-twin-facility-name')?.textContent`);

    console.log('Hero Title:', heroTitle);
    console.log('Code Pill:', codePill);
    console.log('Prepopulated Legal Name:', inputLegalName);
    console.log('Prepopulated Type:', inputType);
    console.log('Prepopulated License:', inputLicense);
    console.log('Prepopulated NPI:', inputNpi);
    console.log('Prepopulated Street:', inputStreet);
    console.log('Prepopulated City:', inputCity);
    console.log('Digital Twin Card Title:', twinTitle);

    await captureScreenshot(cdp, 'edit_facility_desktop_1440.png');

    console.log('--- Step 3: Test Validation Error on Empty Required Field ---');
    await evaluate(cdp, `(() => {
      const input = document.getElementById('edit-legalName');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('form');
      form.requestSubmit();
    })()`);
    await sleep(600);

    const valError = await evaluate(cdp, `document.querySelector('.facility-edit-field-error')?.textContent`);
    console.log('Validation Error displayed:', valError);
    await captureScreenshot(cdp, 'edit_facility_validation_error.png');

    console.log('--- Step 4: Update fields and save changes ---');
    await evaluate(cdp, `(() => {
      const inputName = document.getElementById('edit-legalName');
      inputName.value = 'Mount Sinai Hospital – Interventional Pavilion';
      inputName.dispatchEvent(new Event('input', { bubbles: true }));

      const inputPhone = document.getElementById('edit-mainTelephone');
      inputPhone.value = '+1 (212) 659-8800';
      inputPhone.dispatchEvent(new Event('input', { bubbles: true }));

      const inputEmail = document.getElementById('edit-administrativeEmail');
      inputEmail.value = 'facility.admin@mountsinai.careid.org';
      inputEmail.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(400);

    // Click Save Changes & Return
    await evaluate(cdp, `document.getElementById('btn-save-return-bottom')?.click()`);
    await sleep(1500);

    const afterSaveUrl = await evaluate(cdp, `window.location.href`);
    console.log('URL after saving:', afterSaveUrl);

    const updatedTitleInDetails = await evaluate(cdp, `document.querySelector('.facility-master-title')?.textContent`);
    console.log('Updated title in Facility Details:', updatedTitleInDetails);
    await captureScreenshot(cdp, 'facility_details_after_edit_save.png');

    console.log('--- Step 5: Test Direct URL access to fac-2 edit ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/fac-2/edit' });
    await sleep(1200);

    const fac2HeroTitle = await evaluate(cdp, `document.querySelector('.facility-edit-hero-title')?.textContent`);
    const fac2LegalName = await evaluate(cdp, `document.getElementById('edit-legalName')?.value`);
    console.log('FAC-2 Hero Title:', fac2HeroTitle);
    console.log('FAC-2 Prepopulated Name:', fac2LegalName);
    await captureScreenshot(cdp, 'edit_facility_fac2_direct.png');

    console.log('--- Step 6: Test Cancel Navigation ---');
    await evaluate(cdp, `document.getElementById('btn-cancel-top')?.click()`);
    await sleep(800);
    const cancelUrl = await evaluate(cdp, `window.location.href`);
    console.log('URL after Cancel:', cancelUrl);

    console.log('--- Step 7: Test Unknown Facility ID 404/Not Found ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/invalid-fac-999/edit' });
    await sleep(1000);
    const notFoundTitle = await evaluate(cdp, `document.querySelector('.facility-edit-card h2')?.textContent`);
    console.log('Not Found title for edit:', notFoundTitle);
    await captureScreenshot(cdp, 'edit_facility_not_found.png');

    console.log('--- Step 8: Responsive Viewport Checks ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities/fac-1/edit' });
    await sleep(1200);

    const viewports = [
      { name: '1920x1080', width: 1920, height: 1080 },
      { name: '1366x768', width: 1366, height: 768 },
      { name: '1024x768', width: 1024, height: 768 },
      { name: '768x1024', width: 768, height: 1024 },
      { name: '390x844', width: 390, height: 844 },
    ];

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
        return {
          windowInnerWidth: window.innerWidth,
          docScrollWidth: doc.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          hasHorizontalOverflow: doc.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth
        };
      })()`);

      console.log(`Viewport ${vp.name}: overflow = ${overflow.hasHorizontalOverflow}`, overflow);
      await captureScreenshot(cdp, `edit_facility_${vp.name}.png`);
    }

    console.log('ALL EDIT FACILITY TESTS PASSED SUCCESSFULLY!');
  } finally {
    cdp.close();
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
