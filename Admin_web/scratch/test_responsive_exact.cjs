const fs = require('fs');
const http = require('http');

async function getPageTarget() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const page = list.find(p => p.url.includes('/admin/doctors/create')) || list.find(p => p.type === 'page');
  return page;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const page = await getPageTarget();
  console.log('Target page:', page.title, page.url, page.webSocketDebuggerUrl);

  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.connect();

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, mobile: false },
    { name: '1440x900', width: 1440, height: 900, mobile: false },
    { name: '1366x768', width: 1366, height: 768, mobile: false },
    { name: '1024x768', width: 1024, height: 768, mobile: false },
    { name: '768x1024', width: 768, height: 1024, mobile: false },
    { name: '375x667', width: 375, height: 667, mobile: true },
  ];

  for (const vp of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile
    });

    // Wait 200ms for layout to settle
    await new Promise(r => setTimeout(r, 200));

    const evalResult = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const canvas = document.querySelector('.add-doctor-canvas');
          const wrapper = document.querySelector('.add-doctor-content-wrapper');
          const personalGrid = document.querySelector('.add-doctor-personal-grid');
          const profGrid2 = document.querySelector('.add-doctor-grid-2');
          const hospGrid3 = document.querySelector('.add-doctor-grid-3');
          const docsGrid = document.querySelector('.add-doctor-docs-grid');

          const getCols = (el) => el ? window.getComputedStyle(el).gridTemplateColumns.split(' ').length : 0;
          const getGridStyle = (el) => el ? window.getComputedStyle(el).gridTemplateColumns : 'none';

          return {
            windowInnerWidth: window.innerWidth,
            windowInnerHeight: window.innerHeight,
            docScrollWidth: document.documentElement.scrollWidth,
            docClientWidth: document.documentElement.clientWidth,
            canvasScrollWidth: canvas ? canvas.scrollWidth : 0,
            canvasClientWidth: canvas ? canvas.clientWidth : 0,
            canvasScrollHeight: canvas ? canvas.scrollHeight : 0,
            canvasClientHeight: canvas ? canvas.clientHeight : 0,
            hasHorizontalOverflow: (document.documentElement.scrollWidth > window.innerWidth) || (canvas && canvas.scrollWidth > canvas.clientWidth),
            personalGridCols: getCols(personalGrid),
            personalGridRaw: getGridStyle(personalGrid),
            profGridCols: getCols(profGrid2),
            profGridRaw: getGridStyle(profGrid2),
            hospGridCols: getCols(hospGrid3),
            docsGridCols: getCols(docsGrid),
            wrapperWidth: wrapper ? wrapper.getBoundingClientRect().width : 0
          };
        })()
      `,
      returnByValue: true
    });

    const metrics = evalResult.result.value;
    console.log(`=== Viewport ${vp.name} ===`);
    console.log(JSON.stringify(metrics, null, 2));

    // Capture screenshot
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    const outPath = `scratch/shot_${vp.name}.png`;
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath}`);
  }

  // Reset override
  await client.send('Emulation.clearDeviceMetricsOverride');
  client.close();
  console.log('Finished testing all viewports.');
}

run().catch(console.error);
