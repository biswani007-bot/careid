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
    clientInfo: { name: 'dialog-fetcher', version: '1.0.0' }
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

  console.log('Session ready. Fetching design context for 20:1327 (Deactivate Dialog)...');
  const deactRes = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1327', excludeScreenshot: true }
  }, sessionId);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'deactivate_context.json'), JSON.stringify(deactRes.result, null, 2));
  console.log('Saved deactivate_context.json');

  console.log('Fetching design context for 20:1343 (Reset Password Dialog)...');
  const resetRes = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1343', excludeScreenshot: true }
  }, sessionId);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'reset_context.json'), JSON.stringify(resetRes.result, null, 2));
  console.log('Saved reset_context.json');

  console.log('Fetching design context for 20:1359 (Success Snackbar)...');
  const snackRes = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1359', excludeScreenshot: true }
  }, sessionId);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'snackbar_context.json'), JSON.stringify(snackRes.result, null, 2));
  console.log('Saved snackbar_context.json');

  console.log('Fetching variable defs for 20:1284...');
  const varsRes = await fetchFigmaMCP('tools/call', {
    name: 'get_variable_defs',
    arguments: { nodeId: '20:1284' }
  }, sessionId);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'dialogs_variables.json'), JSON.stringify(varsRes.result, null, 2));
  console.log('Saved dialogs_variables.json');
}

run().catch(console.error);
