const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;

async function getBrowserWs() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const port = 9334;
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
        http.get(`http://127.0.0.1:${port}/json/version`, res => {
          let buf = '';
          res.on('data', d => buf += d);
          res.on('end', () => resolve(JSON.parse(buf)));
        }).on('error', reject);
      });
      return { wsUrl: data.webSocketDebuggerUrl, proc };
    } catch {}
  }
  throw new Error('Failed to start browser');
}

async function main() {
  const { wsUrl, proc } = await getBrowserWs();
  const WebSocket = require('ws');
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));

  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === msgId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === msgId) {
          ws.off('message', handler);
          resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('DOM.enable');

  await sendSession('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1000));

  await sendSession('Runtime.evaluate', {
    expression: `
      localStorage.setItem('careid_access_token', ${JSON.stringify(token)});
      localStorage.setItem('careid_remember_me', 'true');
      localStorage.setItem('careid_user_session', JSON.stringify({
        id: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
        email: 'superadmin@careid.test',
        phone: '+16505550002',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN', 'ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
      }));
    `
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/admin/users' });
  await new Promise(r => setTimeout(r, 2500));

  const layout = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const tableCard = document.querySelector('.users-table-card');
        const scrollContainer = document.querySelector('.users-table-scroll-container');
        const table = document.querySelector('.users-table');
        const rows = Array.from(document.querySelectorAll('.users-table-row'));
        const footer = document.querySelector('.users-pagination-footer');
        const mainCanvas = document.querySelector('.users-main-canvas');
        const mainWrapper = document.querySelector('.careid-main-wrapper');
        const shell = document.querySelector('.careid-dashboard-shell');
        const bentoGrid = document.querySelector('.users-bento-grid');
        const controlsBar = document.querySelector('.users-controls-bar');
        const titleRow = document.querySelector('.users-page-title-row');

        return {
          window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
          shell: shell ? { clientHeight: shell.clientHeight, scrollHeight: shell.scrollHeight } : null,
          mainWrapper: mainWrapper ? { clientHeight: mainWrapper.clientHeight, scrollHeight: mainWrapper.scrollHeight } : null,
          mainCanvas: mainCanvas ? {
            clientHeight: mainCanvas.clientHeight,
            scrollHeight: mainCanvas.scrollHeight,
            offsetHeight: mainCanvas.offsetHeight
          } : null,
          titleRow: titleRow ? { clientHeight: titleRow.clientHeight } : null,
          bentoGrid: bentoGrid ? { clientHeight: bentoGrid.clientHeight } : null,
          controlsBar: controlsBar ? { clientHeight: controlsBar.clientHeight } : null,
          tableCard: tableCard ? {
            clientHeight: tableCard.clientHeight,
            scrollHeight: tableCard.scrollHeight,
            offsetHeight: tableCard.offsetHeight,
            computedHeight: getComputedStyle(tableCard).height,
            computedMaxHeight: getComputedStyle(tableCard).maxHeight,
            computedFlex: getComputedStyle(tableCard).flex
          } : null,
          scrollContainer: scrollContainer ? {
            clientHeight: scrollContainer.clientHeight,
            scrollHeight: scrollContainer.scrollHeight,
            offsetHeight: scrollContainer.offsetHeight,
            computedHeight: getComputedStyle(scrollContainer).height,
            computedMaxHeight: getComputedStyle(scrollContainer).maxHeight,
            computedOverflowY: getComputedStyle(scrollContainer).overflowY,
            computedOverflowX: getComputedStyle(scrollContainer).overflowX,
          } : null,
          table: table ? {
            clientHeight: table.clientHeight,
            scrollHeight: table.scrollHeight,
            offsetHeight: table.offsetHeight
          } : null,
          rowCount: rows.length,
          rowHeights: rows.map(r => r.offsetHeight),
          rowDetails: rows.map(r => ({
            name: r.querySelector('.user-name')?.innerText,
            bounds: r.getBoundingClientRect()
          })),
          footer: footer ? {
            clientHeight: footer.clientHeight,
            offsetHeight: footer.offsetHeight,
            computedHeight: getComputedStyle(footer).height,
            bounds: footer.getBoundingClientRect()
          } : null,
          footerText: footer ? footer.innerText : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Layout Analysis:\n', JSON.stringify(layout.result.value, null, 2));

  const screenshot = await sendSession('Page.captureScreenshot', { format: 'png' });
  const shotPath = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\scratch\\users_table_current.png';
  fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
  console.log('Screenshot saved to', shotPath);

  ws.close();
  proc.kill();
}

main().catch(console.error);
