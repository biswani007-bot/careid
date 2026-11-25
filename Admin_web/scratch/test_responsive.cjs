const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;
const ARTIFACT_DIR = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch';

async function testResponsive() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=768,1024',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getTabs() {
    return new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9227/json/list', res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(JSON.parse(b)));
      }).on('error', reject);
    });
  }

  try {
    const tabs = await getTabs();
    const tab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const payload = JSON.stringify({ id: msgId, method, params });
        const onMsg = (event) => {
          const raw = typeof event.data === 'string' ? event.data : event.toString();
          const parsed = JSON.parse(raw);
          if (parsed.id === msgId) {
            ws.removeEventListener('message', onMsg);
            resolve(parsed.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(payload);
      });
    }

    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1000));

    const seedScript = `
      localStorage.setItem('careid_access_token', ${JSON.stringify(token)});
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'superadmin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN', 'ADMIN'],
        permissions: ['read:all']
      }));
    `;
    await send('Runtime.evaluate', { expression: seedScript });

    await send('Page.navigate', { url: 'http://localhost:5173/admin/users' });
    await new Promise(r => setTimeout(r, 3000));

    const tabletState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const scrollContainer = document.querySelector('.users-table-scroll-container');
          return {
            clientWidth: scrollContainer?.clientWidth,
            scrollWidth: scrollContainer?.scrollWidth,
            hasHorizontalScroll: (scrollContainer?.scrollWidth || 0) > (scrollContainer?.clientWidth || 0),
            hasVerticalScroll: (scrollContainer?.scrollHeight || 0) > (scrollContainer?.clientHeight || 0)
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Tablet (768px):', tabletState.result.value);

    const shotTablet = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'verify_users_tablet_768.png'), Buffer.from(shotTablet.data, 'base64'));
    console.log('Saved screenshot: verify_users_tablet_768.png');

    ws.close();
  } finally {
    proc.kill();
  }
}

testResponsive().catch(console.error);

