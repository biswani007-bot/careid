const fs = require('fs');

async function getPageTarget() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const page = list.find(p => p.url.includes('/admin/')) || list.find(p => p.type === 'page');
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

async function validate() {
  const page = await getPageTarget();
  console.log('Connecting to page:', page.url);

  const client = new CDPClient(page.webSocketDebuggerUrl);
  await client.connect();

  // 1. Navigate to /admin/doctors/doc-2
  console.log('Navigating to /admin/doctors/doc-2...');
  await client.send('Page.navigate', { url: 'http://localhost:5173/admin/doctors/doc-2' });
  await new Promise(r => setTimeout(r, 1500));

  // 2. Responsive checks
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
    await new Promise(r => setTimeout(r, 200));

    const evalResult = await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const canvas = document.querySelector('.doctor-profile-canvas');
          const wrapper = document.querySelector('.doctor-profile-wrapper');
          const doctorName = document.querySelector('.doctor-profile-name')?.textContent;
          const specialty = document.querySelector('.doctor-profile-specialty')?.textContent;
          const careId = document.querySelector('.doctor-profile-meta-val')?.textContent;

          return {
            innerWidth: window.innerWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            docClientWidth: document.documentElement.clientWidth,
            canvasScrollWidth: canvas ? canvas.scrollWidth : 0,
            canvasClientWidth: canvas ? canvas.clientWidth : 0,
            hasHorizontalOverflow: (document.documentElement.scrollWidth > window.innerWidth) || (canvas && canvas.scrollWidth > canvas.clientWidth),
            doctorName,
            specialty,
            careId,
            wrapperWidth: wrapper ? wrapper.getBoundingClientRect().width : 0
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`=== Viewport ${vp.name} ===`);
    console.log(JSON.stringify(evalResult.result.value, null, 2));

    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/doc_profile_${vp.name}.png`, Buffer.from(shot.data, 'base64'));
  }

  // 3. Reset to desktop standard for interaction testing
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 300));

  // Test Dialog: Edit Profile
  console.log('Testing Edit Profile Dialog...');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.doctor-profile-btn.edit')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));
  const editShot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_profile_edit_dialog.png', Buffer.from(editShot.data, 'base64'));

  // Close Edit Dialog
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.patient-dialog-card.edit-profile button[aria-label=\"Close\"]')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));

  // Test Dialog: Reset Password
  console.log('Testing Reset Password Dialog...');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.doctor-profile-btn.reset')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));
  const resetShot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_profile_reset_dialog.png', Buffer.from(resetShot.data, 'base64'));

  // Close Reset Dialog
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.patient-dialog-card.reset-pwd .patient-dialog-btn.cancel')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));

  // Test Dialog: Suspend Doctor
  console.log('Testing Suspend Doctor Dialog...');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.doctor-profile-btn.suspend')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));
  const suspendShot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_profile_suspend_dialog.png', Buffer.from(suspendShot.data, 'base64'));

  // Close Suspend Dialog
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.patient-dialog-card.deactivate .patient-dialog-btn.cancel')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));

  // Test Document Preview Dialog
  console.log('Testing View Document Dialog...');
  await client.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('.doctor-profile-doc-view-btn')[0]?.click()`
  });
  await new Promise(r => setTimeout(r, 300));
  const docShot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_profile_view_doc_dialog.png', Buffer.from(docShot.data, 'base64'));

  // Close Doc Dialog
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.patient-dialog-card.view-doc button[aria-label=\"Close\"]')?.click()`
  });
  await new Promise(r => setTimeout(r, 300));

  // 4. Test Directory to Profile navigation
  console.log('Testing Doctor Directory to Profile Navigation...');
  await client.send('Page.navigate', { url: 'http://localhost:5173/admin/doctors' });
  await new Promise(r => setTimeout(r, 1200));

  // Click row of Dr. Sarah Jenkins
  await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const rows = document.querySelectorAll('.doctors-table tbody tr');
        for (const row of rows) {
          if (row.textContent.includes('Sarah Jenkins')) {
            row.click();
            return true;
          }
        }
        return false;
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const navUrlResult = await client.send('Runtime.evaluate', {
    expression: `window.location.pathname`
  });
  console.log('Navigated URL:', navUrlResult.result.value);

  await client.send('Emulation.clearDeviceMetricsOverride');
  client.close();
  console.log('All Doctor Profile validation tests completed successfully!');
}

validate().catch(console.error);
