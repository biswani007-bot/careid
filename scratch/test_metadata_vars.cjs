const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

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

async function run() {
  const init = await fetchFigmaMCP('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'dialog-vars', version: '1.0.0' }
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

  console.log('Session ready. Fetching variable defs for 20:1327...');
  const varsRes = await fetchFigmaMCP('tools/call', {
    name: 'get_variable_defs',
    arguments: { nodeId: '20:1327' }
  }, sessionId);
  console.log('Variables for 20:1327:', JSON.stringify(varsRes.result, null, 2));

  console.log('Fetching screenshot for 20:1359 (Success Snackbar)...');
  const snackShot = await fetchFigmaMCP('tools/call', {
    name: 'get_screenshot',
    arguments: { nodeId: '20:1359' }
  }, sessionId);
  if (snackShot.result?.result?.content) {
    for (const item of snackShot.result.result.content) {
      if (item.type === 'image' && item.data) {
        const buf = Buffer.from(item.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, 'figma_snackbar_20_1359.png');
        fs.writeFileSync(outPath, buf);
        console.log(`Saved snackbar screenshot to: ${outPath} (${buf.length} bytes)`);
      }
    }
  }
}

run().catch(console.error);
