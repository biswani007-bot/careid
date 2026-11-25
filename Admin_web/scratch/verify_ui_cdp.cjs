const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const tokenObj = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenObj.accessToken;

async function getBrowserWs() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9336;
  const proc = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank'
  ]);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, res => {
          let buf = '';
          res.on('data', d => buf += d);
          res.on('end', () => resolve(JSON.parse(buf)));
        }).on('error', reject);
      });
      const pageTarget = data.find(t => t.type === 'page');
      if (pageTarget) {
        return { wsUrl: pageTarget.webSocketDebuggerUrl, proc };
      }
    } catch {}
  }
  throw new Error('Failed to start browser');
}

async function run() {
  const { wsUrl, proc } = await getBrowserWs();
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(msg.params.type + ': ' + msg.params.args.map(a => a.value).join(' '));
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => ws.on('open', r));

  await send('Runtime.enable');
  await send('Page.enable');

  // Set tokens in localStorage first
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1000));

  await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `
      localStorage.setItem('careid_access_token', '${token}');
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'admin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        permissions: ['read:all', 'write:all', 'read:audit-logs']
      }));
    `
  });

  const pages = [
    '/admin/records',
    '/admin/records/medical',
    '/admin/records/dental',
    '/admin/records/vision',
    '/admin/ocr/queue',
    '/admin/ocr/analytics',
    '/admin/ocr/rejected'
  ];

  for (const p of pages) {
    console.log('Testing page:', p);
    await send('Page.navigate', { url: 'http://localhost:5173' + p });
    await new Promise(r => setTimeout(r, 2500));

    const evalRes = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          return {
            title: document.title,
            h1: document.querySelector('h1')?.innerText || document.querySelector('h2')?.innerText,
            tableRows: document.querySelectorAll('tbody tr').length,
            emptyOrLoaded: document.querySelector('tbody')?.innerText?.slice(0, 100).replace(/\\n/g, ' ') || 'none'
          };
        })()
      `
    });
    console.log('  ->', JSON.stringify(evalRes.result?.value || evalRes));
  }

  const errorLogs = consoleMessages.filter(m => m.startsWith('error'));
  console.log('Console Errors:', errorLogs.length ? errorLogs : 'None');

  proc.kill();
  ws.close();
}

run().catch(console.error);
