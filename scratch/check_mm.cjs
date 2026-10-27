async function test() {
  const res = await fetch('http://127.0.0.1:9222/json');
  const list = await res.json();
  const page = list.find(p => p.url.includes('/admin/doctors/create'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (m, p={}) => new Promise(r => {
    const cur = id++;
    const handler = (msg) => {
      const d = JSON.parse(msg.data);
      if (d.id === cur) { ws.removeEventListener('message', handler); r(d.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  console.log('Reloading page...');
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 1000));

  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
  const r = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.add-doctor-personal-grid');
      const cs = window.getComputedStyle(el);
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.media && window.matchMedia(rule.media.mediaText).matches) {
              for (const inner of rule.cssRules) {
                if (inner.selectorText && inner.selectorText.includes('personal-grid')) {
                  rules.push({ media: rule.media.mediaText, selector: inner.selectorText, cssText: inner.cssText });
                }
              }
            } else if (rule.selectorText && rule.selectorText.includes('personal-grid')) {
              rules.push({ selector: rule.selectorText, cssText: rule.cssText });
            }
          }
        } catch (e) {}
      }
      return {
        gridTemplateColumns: cs.gridTemplateColumns,
        matchedRules: rules
      };
    })()`,
    returnByValue: true
  });
  console.log('Result after reload:', JSON.stringify(r.result.value, null, 2));
  await send('Emulation.clearDeviceMetricsOverride');
  ws.close();
}
test().catch(console.error);
