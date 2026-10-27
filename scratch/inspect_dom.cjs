const http = require('http');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const list = JSON.parse(data);
    const page = list.find(p => p.type === 'page');
    const WebSocket = require('ws');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const el = document.querySelector('.facility-master-card');
            el.style.flexShrink = '0';
            return JSON.stringify({
              rect: el.getBoundingClientRect(),
              computedHeight: window.getComputedStyle(el).height
            });
          })()`,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (m) => {
      console.log('Result:', m.toString());
      process.exit(0);
    });
  });
});
