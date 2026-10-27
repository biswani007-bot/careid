const http = require('http');
const fs = require('fs');

function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const list = JSON.parse(data);
        const page = list.find(p => p.type === 'page');
        resolve(page.webSocketDebuggerUrl);
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
      } catch (e) { }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

async function run() {
  const WebSocket = (await import('ws')).default;
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.on('open', resolve));

  await sendCdp(ws, 'Page.navigate', { url: 'http://localhost:5173/admin/doctors' });
  await new Promise(r => setTimeout(r, 1000));

  // Open first row kebab
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const kebab = document.querySelector('.doctors-action-btn');
      if (kebab) kebab.click();
    `
  });
  await new Promise(r => setTimeout(r, 300));

  // Click Suspend Account
  await sendCdp(ws, 'Runtime.evaluate', {
    expression: `
      const item = Array.from(document.querySelectorAll('.doctors-row-menu-item')).find(i => i.textContent.includes('Suspend') || i.textContent.includes('Activate'));
      if (item) item.click();
    `
  });
  await new Promise(r => setTimeout(r, 500));

  const suspendModalCheck = await sendCdp(ws, 'Runtime.evaluate', {
    expression: `Boolean(document.querySelector('[data-name="Modal 1: Suspend Doctor Account"]'))`,
    returnByValue: true
  });
  console.log('Suspend modal successfully opened from directory row:', suspendModalCheck.result.value);

  const shot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/doc_dir_suspend_modal.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved scratch/doc_dir_suspend_modal.png');

  ws.close();
}

run().catch(console.error);
