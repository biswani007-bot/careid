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
      // open dialog
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `(() => {
            const btn = document.querySelector('button.doctors-action-btn') || document.querySelector('td button');
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
              const header = document.querySelector('[role="dialog"] > div');
              if (!header) return { error: 'No header' };
              
              // Get matched rules
              const matched = [];
              for (const sheet of document.styleSheets) {
                try {
                  for (const rule of sheet.cssRules) {
                    if (rule.selectorText && header.matches(rule.selectorText)) {
                      matched.push({ selector: rule.selectorText, cssText: rule.cssText });
                    }
                  }
                } catch (e) {}
              }

              return {
                className: header.className,
                matchedRules: matched,
                paddingTop: window.getComputedStyle(header).paddingTop,
                paddingRight: window.getComputedStyle(header).paddingRight,
                paddingBottom: window.getComputedStyle(header).paddingBottom,
                paddingLeft: window.getComputedStyle(header).paddingLeft,
              };
            })()`
          }
        }));
      }, 700);
    });

    ws.on('message', (msg) => {
      const res = JSON.parse(msg);
      if (res.id === 2) {
        console.log('Result:', JSON.stringify(res, null, 2));
        process.exit(0);
      }
    });
  });
});
