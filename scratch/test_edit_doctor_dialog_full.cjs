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

  console.log('Connected to CDP');

  // 1. Navigate to /admin/doctors
  await client.send('Page.navigate', { url: 'http://localhost:5173/admin/doctors' });
  await sleep(1500);

  // Set desktop viewport 1280x800
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(500);

  // 2. Open action menu of first doctor (Dr. Sarah Jenkins)
  const openMenuRes = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const actionBtns = Array.from(document.querySelectorAll('button')).filter(b => b.querySelector('svg.lucide-more-vertical') || b.querySelector('svg.lucide-ellipsis-vertical') || b.getAttribute('aria-label') === 'Open menu');
      if (actionBtns.length > 0) {
        actionBtns[0].click();
        return { success: true, count: actionBtns.length };
      }
      // Alternative: search by row action
      const allActionBtns = Array.from(document.querySelectorAll('td button'));
      if (allActionBtns.length > 0) {
        allActionBtns[allActionBtns.length - 1].click();
        return { success: true, fallback: true };
      }
      return { success: false };
    })()`
  });
  console.log('Open action menu:', openMenuRes.result.value);
  await sleep(400);

  // 3. Click "Edit Doctor Info"
  const clickEditRes = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const items = Array.from(document.querySelectorAll('[role="menuitem"], button'));
      const editBtn = items.find(el => el.textContent && el.textContent.includes('Edit Doctor Info'));
      if (editBtn) {
        editBtn.click();
        return { success: true, text: editBtn.textContent.trim() };
      }
      return { success: false, found: items.map(i => i.textContent.trim()) };
    })()`
  });
  console.log('Click Edit Doctor Info:', clickEditRes.result.value);
  await sleep(600);

  // 4. Inspect Dialog Layout & Measurements
  const layoutCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };

      const rect = dialog.getBoundingClientRect();
      const header = dialog.children[0];
      const form = dialog.querySelector('form');
      const footer = dialog.children[2] || dialog.lastElementChild;

      const headerRect = header ? header.getBoundingClientRect() : null;
      const formRect = form ? form.getBoundingClientRect() : null;
      const footerRect = footer ? footer.getBoundingClientRect() : null;

      // Inputs check
      const inputs = Array.from(form.querySelectorAll('input, textarea')).map(input => ({
        id: input.id,
        value: input.value,
        height: input.getBoundingClientRect().height,
        width: input.getBoundingClientRect().width,
      }));

      // Footer buttons
      const buttons = Array.from(footer.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        bg: window.getComputedStyle(b).backgroundColor,
        color: window.getComputedStyle(b).color,
        height: b.getBoundingClientRect().height,
        width: b.getBoundingClientRect().width,
      }));

      return {
        found: true,
        dialog: {
          width: rect.width,
          height: rect.height,
          maxHeight: window.getComputedStyle(dialog).maxHeight,
          borderRadius: window.getComputedStyle(dialog).borderRadius,
          overflow: window.getComputedStyle(dialog).overflow,
        },
        header: {
          height: headerRect.height,
          title: header.querySelector('h2')?.textContent.trim(),
          subtitle: header.querySelector('p')?.textContent.trim(),
          hasCloseBtn: !!header.querySelector('button[aria-label="Close dialog"]'),
          borderBottom: window.getComputedStyle(header).borderBottomWidth,
        },
        form: {
          height: formRect.height,
          scrollHeight: form.scrollHeight,
          isScrollable: form.scrollHeight > form.clientHeight,
          overflowY: window.getComputedStyle(form).overflowY,
          inputCount: inputs.length,
          inputs: inputs,
        },
        footer: {
          height: footerRect.height,
          borderTop: window.getComputedStyle(footer).borderTopWidth,
          buttons: buttons,
        }
      };
    })()`
  });

  console.log('Desktop Dialog Layout Check:', JSON.stringify(layoutCheck.result.value, null, 2));

  // Capture Desktop Screenshot
  const desktopScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const brainDir = 'C:\\\\Users\\\\biswa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
  const desktopPath = path.join(brainDir, 'edit_doctor_dialog_desktop.png');
  fs.writeFileSync(desktopPath, Buffer.from(desktopScreenshot.data, 'base64'));
  console.log('Saved desktop screenshot to', desktopPath);

  // 5. Test Validation Errors
  console.log('Testing validation errors...');
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const setVal = (input, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const nameInput = document.querySelector('form input[name="name"]');
      const specialtyInput = document.querySelector('form input[name="specialty"]');
      const emailInput = document.querySelector('form input[name="email"]');
      const phoneInput = document.querySelector('form input[name="phone"]');

      if (nameInput) setVal(nameInput, '');
      if (specialtyInput) setVal(specialtyInput, '');
      if (emailInput) setVal(emailInput, 'invalid-email');
      if (phoneInput) setVal(phoneInput, '12');

      const submitBtn = document.querySelector('button[type="submit"][form="edit-doctor-form"]') || document.querySelector('button.doctor-modal-btn-save');
      if (submitBtn) submitBtn.click();
    })()`
  });
  await sleep(600);

  const validationCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const errorMsgs = Array.from(document.querySelectorAll('form p.text-\\[\\#ba1a1a\\]')).map(p => p.textContent.trim());
      return {
        errorCount: errorMsgs.length,
        errors: errorMsgs
      };
    })()`
  });
  console.log('Validation Errors Check:', validationCheck.result.value);

  // Capture Validation Screenshot
  const validationScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const validationPath = path.join(brainDir, 'edit_doctor_dialog_validation.png');
  fs.writeFileSync(validationPath, Buffer.from(validationScreenshot.data, 'base64'));
  console.log('Saved validation screenshot to', validationPath);

  // 6. Test Mobile Viewport (375x720)
  console.log('Testing Mobile Viewport (375x720)...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 720,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(600);

  const mobileCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const rect = dialog.getBoundingClientRect();
      const form = dialog.querySelector('form');
      return {
        found: true,
        dialogWidth: rect.width,
        dialogHeight: rect.height,
        expectedMaxWidth: 375 - 32, // 343px
        formScrollable: form.scrollHeight > form.clientHeight,
        formScrollHeight: form.scrollHeight,
        formClientHeight: form.clientHeight,
        hasHorizontalOverflow: dialog.scrollWidth > dialog.clientWidth,
      };
    })()`
  });
  console.log('Mobile Dialog Check:', mobileCheck.result.value);

  const mobileScreenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  const mobilePath = path.join(brainDir, 'edit_doctor_dialog_mobile.png');
  fs.writeFileSync(mobilePath, Buffer.from(mobileScreenshot.data, 'base64'));
  console.log('Saved mobile screenshot to', mobilePath);

  // 7. Reset Viewport to Desktop and test Save Changes with valid data
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(400);

  console.log('Testing Save Changes with valid data...');
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const setVal = (input, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const nameInput = document.querySelector('form input[name="name"]');
      const specialtyInput = document.querySelector('form input[name="specialty"]');
      const emailInput = document.querySelector('form input[name="email"]');
      const phoneInput = document.querySelector('form input[name="phone"]');

      if (nameInput) setVal(nameInput, 'Dr. Sarah Jenkins Updated');
      if (specialtyInput) setVal(specialtyInput, 'Cardiology & Electrophysiology');
      if (emailInput) setVal(emailInput, 's.jenkins.updated@hospital.org');
      if (phoneInput) setVal(phoneInput, '+1 555-019-9999');

      const submitBtn = document.querySelector('button[type="submit"][form="edit-doctor-form"]') || document.querySelector('button.doctor-modal-btn-save');
      if (submitBtn) submitBtn.click();
    })()`
  });
  await sleep(1000);

  // Check if dialog closed and updated row is visible
  const afterSaveCheck = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const rows = Array.from(document.querySelectorAll('table tbody tr')).map(r => r.textContent.trim());
      const hasUpdated = rows.some(r => r.includes('Dr. Sarah Jenkins Updated') || r.includes('s.jenkins.updated@hospital.org'));
      const toast = document.querySelector('[role="status"], .toaster, [data-sonner-toast]');
      return {
        dialogClosed: !dialog,
        tableHasUpdated: hasUpdated,
        toastText: toast ? toast.textContent.trim() : null,
      };
    })()`
  });
  console.log('After Save Changes:', afterSaveCheck.result.value);

  client.close();
  console.log('Test completed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
