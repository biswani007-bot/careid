const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function inspectAdminWeb() {
  console.log('--- Launching Chrome via CDP ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\PABANI\\chrome-temp-inspect-' + Date.now();

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  let wsUrl = null;

  // Wait for DevTools listening line on stderr
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for DevTools URL')), 10000);
    chromeProc.stderr.on('data', data => {
      const str = data.toString();
      const match = str.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        wsUrl = match[1];
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  console.log('Connected to Chrome DevTools WebSocket:', wsUrl);

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const consoleLogs = [];
  const networkRequests = [];
  const networkErrors = [];

  await new Promise(res => ws.onopen = res);

  // 1. Create a new target page for careidadmin.vnvision.in
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  console.log('Attached to target session:', sessionId);

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  ws.onmessage = evt => {
    const msg = JSON.parse(evt.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(msg.error);
      else p.resolve(msg.result);
    }

    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push({ type: msg.params.type, text });
    }
    if (msg.method === 'Log.entryAdded') {
      consoleLogs.push({ type: msg.params.entry.level, text: msg.params.entry.text });
    }
    if (msg.method === 'Network.requestWillBeSent') {
      networkRequests.push({
        requestId: msg.params.requestId,
        url: msg.params.request.url,
        method: msg.params.request.method
      });
    }
    if (msg.method === 'Network.responseReceived') {
      const req = networkRequests.find(r => r.requestId === msg.params.requestId);
      if (req) {
        req.status = msg.params.response.status;
        req.statusText = msg.params.response.statusText;
        req.mimeType = msg.params.response.mimeType;
      }
    }
    if (msg.method === 'Network.loadingFailed') {
      networkErrors.push({
        requestId: msg.params.requestId,
        errorText: msg.params.errorText,
        canceled: msg.params.canceled
      });
    }
  };

  // Enable domains
  await sendSession('Page.enable');
  await sendSession('Network.enable');
  await sendSession('Runtime.enable');
  await sendSession('Log.enable');

  console.log('Navigating to https://careidadmin.vnvision.in/ ...');
  await sendSession('Page.navigate', { url: 'https://careidadmin.vnvision.in/' });

  // Wait for 6 seconds for bundle download, execution, and rendering
  await new Promise(r => setTimeout(r, 6000));

  // Extract page title, DOM details, forms, buttons
  const evalRes = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const title = document.title;
      const h1s = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText);
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        name: i.name,
        id: i.id,
        value: i.value,
        className: i.className
      }));
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        type: b.type,
        disabled: b.disabled,
        className: b.className
      }));
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText,
        href: a.href
      }));
      const bodyText = document.body.innerText.substring(0, 1500);
      return {
        title,
        h1s,
        inputs,
        buttons,
        links,
        bodyText
      };
    })()`,
    returnByValue: true
  });

  // Capture screenshot
  const screenshotRes = await sendSession('Page.captureScreenshot', { format: 'png' });
  const screenshotBuffer = Buffer.from(screenshotRes.data, 'base64');
  const screenshotPath = 'C:\\Users\\PABANI\\careidadmin_login_rendered.png';
  fs.writeFileSync(screenshotPath, screenshotBuffer);
  console.log('Screenshot saved to:', screenshotPath, `(${screenshotBuffer.length} bytes)`);

  console.log('\n=== PAGE DETAILS ===');
  console.log('Title:', evalRes.result.value.title);
  console.log('Headings:', evalRes.result.value.h1s);
  console.log('Inputs:', evalRes.result.value.inputs);
  console.log('Buttons:', evalRes.result.value.buttons);
  console.log('Links:', evalRes.result.value.links);
  console.log('\n=== BODY TEXT PREVIEW ===\n', evalRes.result.value.bodyText);

  console.log('\n=== NETWORK REQUESTS (' + networkRequests.length + ') ===');
  networkRequests.forEach(r => {
    console.log(`[${r.status || '...'} ${r.method}] ${r.url} (${r.mimeType || ''})`);
  });

  console.log('\n=== NETWORK FAILURES (' + networkErrors.length + ') ===');
  networkErrors.forEach(e => console.log(e));

  console.log('\n=== CONSOLE LOGS (' + consoleLogs.length + ') ===');
  consoleLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  // Close chrome
  ws.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {}
}

inspectAdminWeb().catch(e => {
  console.error('Inspection failed:', e);
  process.exit(1);
});

