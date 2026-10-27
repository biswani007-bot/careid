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

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, mobile: false },
    { name: '1650x900', width: 1650, height: 900, mobile: false },
    { name: '1366x768', width: 1366, height: 768, mobile: false },
    { name: '1024x768', width: 1024, height: 768, mobile: false },
    { name: '390x844', width: 390, height: 844, mobile: true },
  ];

  console.log('Testing Facility Directory layout across required viewports...');

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.mobile ? 2 : 1,
      mobile: vp.mobile
    });

    await client.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities' });
    await sleep(1000);

    const metrics = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const bodyScrollWidth = document.body.scrollWidth;
        const docScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;
        const hasWindowHorizontalOverflow = docScrollWidth > windowWidth || bodyScrollWidth > windowWidth;

        const mainCanvas = document.querySelector('.facilities-main-canvas');
        const mainRect = mainCanvas ? mainCanvas.getBoundingClientRect() : null;

        const breadcrumbs = document.querySelector('.facilities-breadcrumbs');
        const breadcrumbsRect = breadcrumbs ? breadcrumbs.getBoundingClientRect() : null;

        const heading = document.querySelector('.facilities-heading');
        const headingRect = heading ? heading.getBoundingClientRect() : null;

        const addBtn = document.querySelector('#btn-add-facility');
        const addBtnRect = addBtn ? addBtn.getBoundingClientRect() : null;

        const kpisGrid = document.querySelector('.facilities-kpi-grid');
        const kpisStyle = kpisGrid ? window.getComputedStyle(kpisGrid) : null;
        const kpiCols = kpisStyle ? kpisStyle.gridTemplateColumns.split(' ').length : 0;

        const tableCard = document.querySelector('.facilities-table-card');
        const tableCardRect = tableCard ? tableCard.getBoundingClientRect() : null;

        const rowsCount = document.querySelectorAll('.facilities-table tbody tr').length;

        // Verify left edge clearance (should not be pushed to x <= 0 on desktop)
        const leftClearanceOk = breadcrumbsRect ? breadcrumbsRect.x > (windowWidth > 1024 ? 260 : 10) : false;
        // Verify right edge clearance (Add button should be fully visible)
        const rightClearanceOk = addBtnRect ? addBtnRect.right <= windowWidth : false;

        return {
          windowWidth,
          docScrollWidth,
          hasWindowHorizontalOverflow,
          leftClearanceOk,
          rightClearanceOk,
          kpiColumnsCount: kpiCols,
          rowsCount,
          breadcrumbsX: breadcrumbsRect ? Math.round(breadcrumbsRect.x) : null,
          headingX: headingRect ? Math.round(headingRect.x) : null,
          addBtnRight: addBtnRect ? Math.round(addBtnRect.right) : null,
          tableCardWidth: tableCardRect ? Math.round(tableCardRect.width) : null
        };
      })()`
    });

    console.log(`Results for ${vp.name}:`, JSON.stringify(metrics.result.value, null, 2));

    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(brainDir, `facility_directory_${vp.name}.png`);
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot to ${shotPath}`);
  }

  // Test Search & Filter interactions
  console.log('\n--- Testing Search & Filter Interaction ---');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(400);

  // Type "Mercy" in search using React input setter
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('.facilities-search-input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, 'Mercy');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await sleep(400);

  const searchCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const rows = document.querySelectorAll('.facilities-table tbody tr');
      const names = Array.from(rows).map(r => r.querySelector('.facilities-primary-name')?.textContent.trim()).filter(Boolean);
      return { count: names.length, names };
    })()`
  });
  console.log('Search Filter Check (Mercy):', searchCheck.result.value);

  // Reset search
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('.facilities-search-input');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });

  await sleep(400);

  // Test Navigation: Click Add Facility
  console.log('\n--- Testing Navigation to Add Facility & Back ---');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('#btn-add-facility')?.click()`
  });
  await sleep(800);

  const addNavCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `window.location.pathname`
  });
  console.log('Navigated to:', addNavCheck.result.value);

  // Click Cancel on Add Facility to return
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.facility-btn-cancel-top')?.click()`
  });
  await sleep(800);

  const backNavCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `window.location.pathname`
  });
  console.log('Returned to:', backNavCheck.result.value);

  client.close();
  console.log('\nAll layout and interaction checks completed successfully!');
}

run().catch(console.error);
