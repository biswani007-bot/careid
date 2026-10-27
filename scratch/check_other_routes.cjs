const http = require('http');
const WebSocket = require('ws');

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

async function run() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const handler = (m) => {
      const res = JSON.parse(m);
      if (res.id === msgId) {
        ws.off('message', handler);
        if (res.error) reject(res.error);
        else resolve(res.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  const routes = ['/admin/dashboard', '/admin/doctors', '/admin/users', '/admin/facilities/create', '/admin/facilities'];
  for (const route of routes) {
    await send('Page.navigate', { url: 'http://localhost:5173' + route });
    await new Promise(r => setTimeout(r, 700));
    const res = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => ({
        url: window.location.pathname,
        h1: document.querySelector('h1')?.textContent.trim(),
        hasSidebar: !!document.querySelector('.careid-sidebar')
      }))()`
    });
    console.log('Route Verification:', res.result ? res.result.value : res);
  }

  ws.close();
}

run().catch(console.error);
