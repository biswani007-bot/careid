const fs = require('fs');
const path = require('path');

const ASSETS_DIR = 'D:\\New folder\\New folder\\healthvault\\src\\assets\\users';

async function fetchFigmaMCP(method, params, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const res = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });

  const nextSessionId = res.headers.get('mcp-session-id') || sessionId;
  const rawText = await res.text();

  let result = null;
  const lines = rawText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        result = JSON.parse(line.substring(6));
      } catch {}
    }
  }
  if (!result) {
    try {
      result = JSON.parse(rawText);
    } catch {
      result = rawText;
    }
  }

  return { result, sessionId: nextSessionId };
}

async function saveNodeScreenshot(nodeId, filename, sessionId) {
  console.log(`Fetching screenshot for ${nodeId} -> ${filename}...`);
  const res = await fetchFigmaMCP('tools/call', {
    name: 'get_screenshot',
    arguments: { nodeId, contentsOnly: true }
  }, sessionId);

  if (res.result?.result?.content) {
    for (const item of res.result.result.content) {
      if (item.type === 'image' && item.data) {
        const buf = Buffer.from(item.data, 'base64');
        const outPath = path.join(ASSETS_DIR, filename);
        fs.writeFileSync(outPath, buf);
        console.log(`Saved ${filename} (${buf.length} bytes)`);
        return;
      }
    }
  }
  console.log(`Could not get screenshot for ${nodeId}`);
}

async function run() {
  const init = await fetchFigmaMCP('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'asset-downloader', version: '1.0.0' }
  });
  const sessionId = init.sessionId;

  await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
  });

  // Deactivate Icon Badge (20:1330)
  await saveNodeScreenshot('20:1330', 'dialog-icon-deactivate.png', sessionId);

  // Reset Password Icon Badge (20:1346)
  await saveNodeScreenshot('20:1346', 'dialog-icon-reset.png', sessionId);

  // Snackbar checkmark icon (20:1362)
  await saveNodeScreenshot('20:1362', 'snackbar-icon-check.png', sessionId);

  console.log('Finished downloading dialog assets!');
}

run().catch(console.error);
