const http = require('http');
const fs = require('fs');

function getWsUrl() {
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
            reject(new Error('No page found'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sendCdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const msg = JSON.stringify({ id, method, params });
    const handler = (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.id === id) {
          ws.off('message', handler);
          if (parsed.error) reject(parsed.error);
          else resolve(parsed.result);
        }
      } catch (e) {
        // ignore
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function run() {
  const WebSocket = (await import('ws')).default;
  const wsUrl = await getWsUrl();
  console.log('Connecting to WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);

  await new Promise(resolve => ws.on('open', resolve));
  console.log('Connected to CDP');

  // Navigate to Doctor Actions & States page
  console.log('Navigating to http://localhost:5173/admin/doctors/actions ...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/admin/doctors/actions' });
  await new Promise(r => setTimeout(r, 1200));

  // Test standard viewports for responsive checks
  const viewports = [
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1366, height: 768, name: '1366x768' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 375, height: 667, name: '375x667' }
  ];

  for (const vp of viewports) {
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await new Promise(r => setTimeout(r, 400));

    const evalRes = await sendCdp(ws, 'Runtime.evaluate', {
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      })`,
      returnByValue: true
    });

    console.log(`Viewport ${vp.name}:`, evalRes.result.value);

    // Capture screenshot of desktop
    if (vp.name === '1920x1080' || vp.name === '1440x900' || vp.name === '375x667') {
      const shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`scratch/doc_actions_${vp.name}.png`, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot scratch/doc_actions_${vp.name}.png`);
    }
  }

  // Restore 1440x900
  await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise(r => setTimeout(r, 400));

  // Test interactive buttons in Dual Modal view
  console.log('Testing Dual Modal interaction...');
  const dualModalCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `Boolean(document.querySelector('[data-name="Modal 1: Suspend Doctor Account"]') && document.querySelector('[data-name="Modal 2: Reset Doctor Password"]'))`,
    returnByValue: true
  });
  console.log('Dual modals present on screen:', dualModalCheck.result.value);

  // Switch to Caught Up view
  console.log('Testing switch to Caught-Up View...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const caughtUpBtn = btns.find(b => b.textContent.includes('Caught-Up'));
      if (caughtUpBtn) caughtUpBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 500));
  const caughtUpCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `document.body.innerText.includes("You're all caught up!")`,
    returnByValue: true
  });
  console.log('Caught up state visible:', caughtUpCheck.result.value);
  const shotCaughtUp = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_actions_caught_up.png', Buffer.from(shotCaughtUp.data, 'base64'));

  // Switch to Hub view
  console.log('Testing switch to Hub View...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const dualBtn = btns.find(b => b.textContent.includes('Dual-Modal') || b.textContent.includes('Layout'));
      if (dualBtn) dualBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 400));
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const hubBtn = btns.find(b => b.textContent.includes('Hub') || b.textContent.includes('Interactive'));
      if (hubBtn) hubBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 500));
  const hubCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `document.body.innerText.includes("Doctor Management Actions & States")`,
    returnByValue: true
  });
  console.log('Hub view visible:', hubCheck.result.value);
  const shotHub = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_actions_hub.png', Buffer.from(shotHub.data, 'base64'));

  // Now test Doctor Directory integration
  console.log('Navigating to http://localhost:5173/admin/doctors ...');
  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/admin/doctors' });
  await new Promise(r => setTimeout(r, 1200));

  // Check header button for Actions & States
  const headerBtnCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Actions & States')))`,
    returnByValue: true
  });
  console.log('Header "Actions & States" button present:', headerBtnCheck.result.value);

  // Click first row kebab menu
  console.log('Opening first row kebab action menu...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const kebab = document.querySelector('.doctors-action-btn');
      if (kebab) kebab.click();
    `
  });
  await new Promise(r => setTimeout(r, 400));

  // Check menu items
  const menuItemsCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `({
      hasEdit: Array.from(document.querySelectorAll('.doctors-row-menu-item')).some(i => i.textContent.includes('Edit')),
      hasReset: Array.from(document.querySelectorAll('.doctors-row-menu-item')).some(i => i.textContent.includes('Reset')),
      hasSuspend: Array.from(document.querySelectorAll('.doctors-row-menu-item')).some(i => i.textContent.includes('Suspend') || i.textContent.includes('Activate'))
    })`,
    returnByValue: true
  });
  console.log('Row kebab menu options:', menuItemsCheck.result.value);

  // Click Reset Password to verify ResetDoctorPasswordDialog opens
  console.log('Clicking Reset Password from table row...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const resetItem = Array.from(document.querySelectorAll('.doctors-row-menu-item')).find(i => i.textContent.includes('Reset'));
      if (resetItem) resetItem.click();
    `
  });
  await new Promise(r => setTimeout(r, 500));
  const resetModalCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `Boolean(document.querySelector('[data-name="Modal 2: Reset Doctor Password"]'))`,
    returnByValue: true
  });
  console.log('Reset Password modal opened from table row:', resetModalCheck.result.value);
  const shotResetModal = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_dir_reset_modal.png', Buffer.from(shotResetModal.data, 'base64'));

  // Close modal via Cancel
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const cancelBtn = document.querySelector('.doctor-modal-btn-cancel');
      if (cancelBtn) cancelBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 400));

  // Click first row kebab menu again and click Suspend Account
  console.log('Opening first row kebab action menu to test Suspend Account...');
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const kebab = document.querySelector('.doctors-action-btn');
      if (kebab) kebab.click();
    `
  });
  await new Promise(r => setTimeout(r, 400));
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const suspendItem = Array.from(document.querySelectorAll('.doctors-row-menu-item')).find(i => i.textContent.includes('Suspend') || i.textContent.includes('Activate'));
      if (suspendItem) suspendItem.click();
    `
  });
  await new Promise(r => setTimeout(r, 500));
  const suspendModalCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `Boolean(document.querySelector('[data-name="Modal 1: Suspend Doctor Account"]'))`,
    returnByValue: true
  });
  console.log('Suspend modal opened from table row:', suspendModalCheck.result.value);
  const shotSuspendModal = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_dir_suspend_modal.png', Buffer.from(shotSuspendModal.data, 'base64'));

  // Close suspend modal via Cancel
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const cancelBtn = document.querySelector('.doctor-modal-btn-cancel');
      if (cancelBtn) cancelBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('All tests completed successfully!');
  ws.close();
}

run().catch(err => {
  console.error('Validation script error:', err);
  process.exit(1);
});
