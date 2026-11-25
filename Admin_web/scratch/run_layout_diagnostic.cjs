const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;

async function runLayoutDiagnostic() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getTabs() {
    return new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9225/json/list', res => {
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
        id: 'bc6f6875-434c-4050-b893-07343cc27986',
        email: 'superadmin@careid.test',
        phone: '+16505550001',
        status: 'ACTIVE',
        roles: ['SUPER_ADMIN'],
        permissions: ['read:all', 'write:all', 'delete:all', 'read:audit-logs']
      }));
    `;
    await send('Runtime.evaluate', { expression: seedScript });

    await send('Page.navigate', { url: 'http://localhost:5173/admin/users' });
    await new Promise(r => setTimeout(r, 3000));

    const diagScript = `
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
            hasVerticalScroll: scrollContainer.scrollHeight > scrollContainer.clientHeight,
            hasHorizontalScroll: scrollContainer.scrollWidth > scrollContainer.clientWidth
          } : null,
          table: table ? {
            clientHeight: table.clientHeight,
            scrollHeight: table.scrollHeight,
            offsetHeight: table.offsetHeight
          } : null,
          rowCount: rows.length,
          rowHeights: rows.map(r => r.offsetHeight),
          rowsVisibleInScrollContainer: rows.map((r, i) => {
            const scRect = scrollContainer.getBoundingClientRect();
            const rRect = r.getBoundingClientRect();
            const visibleTop = Math.max(scRect.top, rRect.top);
            const visibleBottom = Math.min(scRect.bottom, rRect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            return {
              row: i + 1,
              name: r.querySelector('.user-name')?.innerText,
              height: rRect.height,
              visibleHeight,
              isFullyVisible: visibleHeight >= rRect.height - 1
            };
          }),
          footer: footer ? {
            clientHeight: footer.clientHeight,
            offsetHeight: footer.offsetHeight,
            text: footer.innerText.trim(),
            rect: footer.getBoundingClientRect()
          } : null
        };
      })()
    `;

    const diag = await send('Runtime.evaluate', { expression: diagScript, returnByValue: true });
    console.log('DIAGNOSTIC RESULT:');
    console.log(JSON.stringify(diag.result.value, null, 2));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\scratch\\users_table_current.png';
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot to:', shotPath);

    ws.close();
  } finally {
    proc.kill();
  }
}

runLayoutDiagnostic().catch(console.error);

