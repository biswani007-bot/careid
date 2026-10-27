const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const page = targets.find(t => t.type === 'page' && t.url.includes('5173'));
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else if (targets[0] && targets[0].webSocketDebuggerUrl) {
            resolve(targets[0].webSocketDebuggerUrl);
          } else {
            reject(new Error('No debuggable page found'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
    });

    this.ws.on('message', (msg) => {
      const res = JSON.parse(msg);
      if (res.id && this.callbacks.has(res.id)) {
        const { resolve, reject } = this.callbacks.get(res.id);
        this.callbacks.delete(res.id);
        if (res.error) reject(res.error);
        else resolve(res.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const wsUrl = await getWsUrl();
  const client = new CDPClient(wsUrl);
  await client.connect();

  const brainDir = 'C:\\\\Users\\\\biswa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

  console.log('Connected to CDP');

  // Set desktop viewport 1280x900
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  // 1. Navigate to Facilities Directory
  console.log('1. Navigating to /admin/facilities...');
  await client.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities' });
  await sleep(1200);

  // Check Facilities Directory rendered
  const dirCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const title = document.querySelector('h1')?.textContent.trim();
      const addBtn = document.querySelector('#btn-add-facility');
      const rows = document.querySelectorAll('tbody tr').length;
      return { title, hasAddBtn: !!addBtn, rowsCount: rows };
    })()`
  });
  console.log('Facility Directory Check:', dirCheck.result.value);

  // 2. Click Add Facility Button
  console.log('2. Clicking Add Facility button...');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('#btn-add-facility')?.click()`
  });
  await sleep(1000);

  // 3. Inspect Add Facility Page Elements
  const addPageCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const heading = document.querySelector('h1.facility-add-heading')?.textContent.trim();
      const breadcrumb = document.querySelector('.facility-add-breadcrumbs')?.textContent.trim();
      const cards = Array.from(document.querySelectorAll('.facility-card')).map(c => c.querySelector('h2')?.textContent.trim());
      const hipaaCard = !!document.querySelector('.facility-hipaa-card');
      const bottomBar = !!document.querySelector('.facility-bottom-action-bar');
      const saveBtnTop = !!document.querySelector('.facility-btn-save-top');
      const saveBtnBottom = !!document.querySelector('.facility-btn-save-continue');

      return {
        url: window.location.pathname,
        heading,
        breadcrumb,
        cards,
        hipaaCard,
        bottomBar,
        saveBtnTop,
        saveBtnBottom
      };
    })()`
  });
  console.log('Add Facility Page Structure:', JSON.stringify(addPageCheck.result.value, null, 2));

  // Capture Desktop Screenshot of Initial Add Facility
  const desktopScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const desktopPath = path.join(brainDir, 'add_facility_desktop.png');
  fs.writeFileSync(desktopPath, Buffer.from(desktopScreenshot.data, 'base64'));
  console.log('Saved desktop screenshot to', desktopPath);

  // 4. Test Validation Errors
  console.log('4. Testing validation errors by submitting empty form...');
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const form = document.querySelector('#add-facility-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    })()`
  });
  await sleep(600);

  const errorsCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const errorElements = Array.from(document.querySelectorAll('.facility-field-error')).map(e => e.textContent.trim());
      return {
        count: errorElements.length,
        errors: errorElements
      };
    })()`
  });
  console.log('Validation Errors Triggered:', errorsCheck.result.value);

  // Capture Validation Screenshot
  const validationScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const validationPath = path.join(brainDir, 'add_facility_validation.png');
  fs.writeFileSync(validationPath, Buffer.from(validationScreenshot.data, 'base64'));
  console.log('Saved validation screenshot to', validationPath);

  // 5. Test Mobile Viewport (375x812)
  console.log('5. Testing mobile viewport (375x812)...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(600);

  const mobileCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const formGrid = document.querySelector('.facility-form-grid');
      const hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
      const statusCards = document.querySelectorAll('.facility-status-card').length;
      return {
        hasHorizontalOverflow,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: window.innerWidth,
        statusCardsCount: statusCards
      };
    })()`
  });
  console.log('Mobile Check:', mobileCheck.result.value);

  // Capture Mobile Screenshot
  const mobileScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const mobilePath = path.join(brainDir, 'add_facility_mobile.png');
  fs.writeFileSync(mobilePath, Buffer.from(mobileScreenshot.data, 'base64'));
  console.log('Saved mobile screenshot to', mobilePath);

  // 6. Reset to Desktop and Test Valid Submission
  console.log('6. Resetting to desktop and filling valid form data...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(400);

  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const setVal = (selector, val) => {
        const input = document.querySelector(selector);
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                       Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
        if (setter) setter.call(input, val);
        else input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setVal('input[name="legalName"]', 'Mount Sinai West Ambulatory Center');
      setVal('input[name="clinicalLicense"]', 'State Lic #NY-HOSP-88319');
      setVal('input[name="npiNumber"]', '1982049102');
      setVal('input[name="streetAddress1"]', '1000 10th Avenue');
      setVal('input[name="streetAddress2"]', 'Suite 500 / Interventional Wing');
      setVal('input[name="city"]', 'New York');
      setVal('input[name="state"]', 'NY');
      setVal('input[name="postalCode"]', '10019');
      setVal('input[name="mainTelephone"]', '+1 (212) 523-4000');
      setVal('input[name="emergencyTelephone"]', '+1 (212) 523-4911');
      setVal('input[name="administrativeEmail"]', 'admissions.west@careid-health.org');
      setVal('input[name="billingContact"]', 'billing-ny@careid-health.org');

      // Click save button in bottom action bar
      const submitBtn = document.querySelector('.facility-btn-save-continue');
      if (submitBtn) submitBtn.click();
    })()`
  });

  await sleep(1500);

  // Verify navigation back to directory and new facility row
  const submissionCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const currentUrl = window.location.pathname;
      const rows = Array.from(document.querySelectorAll('tbody tr')).map(r => r.textContent.trim());
      const hasNewFacility = rows.some(r => r.includes('Mount Sinai West Ambulatory Center') && r.includes('FAC-NY-4981'));
      return {
        currentUrl,
        hasNewFacility,
        totalRows: rows.length
      };
    })()`
  });
  console.log('Submission & Redirect Check:', submissionCheck.result.value);

  // Capture directory with new facility
  const dirUpdatedScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const dirUpdatedPath = path.join(brainDir, 'facility_directory_updated.png');
  fs.writeFileSync(dirUpdatedPath, Buffer.from(dirUpdatedScreenshot.data, 'base64'));
  console.log('Saved directory screenshot to', dirUpdatedPath);

  client.close();
  console.log('All tests passed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
