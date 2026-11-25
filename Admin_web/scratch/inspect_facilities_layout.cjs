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

async function run() {
  const wsUrl = await getWsUrl();
  const client = new CDPClient(wsUrl);
  await client.connect();

  const brainDir = 'C:\\\\Users\\\\biswa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

  // Test at 1366x768
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false
  });

  await client.send('Page.navigate', { url: 'http://localhost:5173/admin/facilities' });
  await new Promise(r => setTimeout(r, 1200));

  const info = await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const main = document.querySelector('main');
      const matched = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && main.matches(rule.selectorText)) {
              matched.push({ selector: rule.selectorText, cssText: rule.cssText });
            }
          }
        } catch(e) {}
      }
      return {
        matched,
        mainClasses: Array.from(main.classList),
        mainInlineStyle: main.getAttribute('style')
      };
    })()`
  });

  console.log('Inspection:', JSON.stringify(info.result.value, null, 2));


  const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(brainDir, 'facility_directory_current_bug.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('Saved screenshot to facility_directory_current_bug.png');

  client.close();
}

run().catch(console.error);
