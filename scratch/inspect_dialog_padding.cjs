const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const targets = JSON.parse(data);
    const page = targets.find(t => t.type === 'page' && t.url.includes('5173'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `(() => {
            const btn = document.querySelector('td button');
            if (btn) btn.click();
            setTimeout(() => {
              const edit = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit Doctor Info'));
              if (edit) edit.click();
            }, 200);
          })()`
        }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            returnByValue: true,
            expression: `(() => {
              const dialog = document.querySelector('[role="dialog"]');
              if (!dialog) return { error: 'No dialog' };
              const form = dialog.querySelector('form');
              const header = dialog.children[0];
              const footer = dialog.children[2];
              
              const sheets = Array.from(document.styleSheets);
              const p5Rules = [];
              for (const s of sheets) {
                try {
                  for (const r of s.cssRules) {
                    if (r.selectorText && (r.selectorText.includes('p-5') || r.selectorText.includes('p-6') || r.selectorText.includes('p-4'))) {
                      p5Rules.push({ selector: r.selectorText, css: r.cssText });
                    }
                  }
                } catch (e) {}
              }

              return {
                dialogClasses: dialog.className,
                dialogPadding: window.getComputedStyle(dialog).padding,
                headerPadding: window.getComputedStyle(header).padding,
                headerClasses: header ? header.className : null,
                formPadding: window.getComputedStyle(form).padding,
                formClasses: form ? form.className : null,
                footerPadding: window.getComputedStyle(footer).padding,
                footerClasses: footer ? footer.className : null,
                p5Rules: p5Rules.slice(0, 10),
              };
            })()`
          }
        }));
      }, 700);
    });

    ws.on('message', (msg) => {
      const res = JSON.parse(msg);
      if (res.id === 2) {
        console.log('Result:', JSON.stringify(res.result, null, 2));
        process.exit(0);
      }
    });
  });
});
