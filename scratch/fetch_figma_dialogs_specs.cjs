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

  // Parse SSE or JSON
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
  console.log('1. Initializing Figma MCP session...');
  const init = await fetchFigmaMCP('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'antigravity-dialog-inspector', version: '1.0.0' }
  });
  const sessionId = init.sessionId;
  console.log('Session initialized:', sessionId);

  // Send initialized notification if needed
  await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    })
  });

  // 1. Get screenshot of 20:1284 (Full frame: Admin Portal - User Action Dialogs)
  console.log('\n2. Fetching screenshot for 20:1284...');
  const screenShotRes = await fetchFigmaMCP('tools/call', {
    name: 'get_screenshot',
    arguments: { nodeId: '20:1284' }
  }, sessionId);

  if (screenShotRes.result && screenShotRes.result.result && screenShotRes.result.result.content) {
    for (const item of screenShotRes.result.result.content) {
      if (item.type === 'image' && item.data) {
        const buf = Buffer.from(item.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, 'figma_user_action_dialogs_20_1284.png');
        fs.writeFileSync(outPath, buf);
        console.log(`Saved screenshot to: ${outPath} (${buf.length} bytes)`);
      } else if (item.type === 'text') {
        console.log('Screenshot note:', item.text);
      }
    }
  } else {
    console.log('Screenshot response:', JSON.stringify(screenShotRes.result));
  }

  // 2. Get screenshot of Deactivate User Dialog (20:1327)
  console.log('\n3. Fetching screenshot for Deactivate User Dialog (20:1327)...');
  const deactShot = await fetchFigmaMCP('tools/call', {
    name: 'get_screenshot',
    arguments: { nodeId: '20:1327' }
  }, sessionId);
  if (deactShot.result?.result?.content) {
    for (const item of deactShot.result.result.content) {
      if (item.type === 'image' && item.data) {
        const buf = Buffer.from(item.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, 'figma_dialog_deactivate_20_1327.png');
        fs.writeFileSync(outPath, buf);
        console.log(`Saved deactivate dialog screenshot to: ${outPath} (${buf.length} bytes)`);
      }
    }
  }

  // 3. Get screenshot of Reset Password Dialog (20:1343)
  console.log('\n4. Fetching screenshot for Reset Password Dialog (20:1343)...');
  const resetShot = await fetchFigmaMCP('tools/call', {
    name: 'get_screenshot',
    arguments: { nodeId: '20:1343' }
  }, sessionId);
  if (resetShot.result?.result?.content) {
    for (const item of resetShot.result.result.content) {
      if (item.type === 'image' && item.data) {
        const buf = Buffer.from(item.data, 'base64');
        const outPath = path.join(ARTIFACT_DIR, 'figma_dialog_reset_password_20_1343.png');
        fs.writeFileSync(outPath, buf);
        console.log(`Saved reset password dialog screenshot to: ${outPath} (${buf.length} bytes)`);
      }
    }
  }

  // 4. Get design context for 20:1284
  console.log('\n5. Fetching design context for 20:1284...');
  const designCtx = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1284', forceCode: true }
  }, sessionId);

  const designCtxPath = path.join(ARTIFACT_DIR, 'figma_design_context_20_1284.json');
  fs.writeFileSync(designCtxPath, JSON.stringify(designCtx.result, null, 2));
  console.log(`Saved design context to: ${designCtxPath}`);

  // 5. Get design context for Deactivate Dialog (20:1327)
  console.log('\n6. Fetching design context for Deactivate Dialog (20:1327)...');
  const deactCtx = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1327', forceCode: true }
  }, sessionId);
  const deactCtxPath = path.join(ARTIFACT_DIR, 'figma_design_context_20_1327.json');
  fs.writeFileSync(deactCtxPath, JSON.stringify(deactCtx.result, null, 2));
  console.log(`Saved deactivate context to: ${deactCtxPath}`);

  // 6. Get design context for Reset Password Dialog (20:1343)
  console.log('\n7. Fetching design context for Reset Password Dialog (20:1343)...');
  const resetCtx = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1343', forceCode: true }
  }, sessionId);
  const resetCtxPath = path.join(ARTIFACT_DIR, 'figma_design_context_20_1343.json');
  fs.writeFileSync(resetCtxPath, JSON.stringify(resetCtx.result, null, 2));
  console.log(`Saved reset password context to: ${resetCtxPath}`);

  // 7. Get design context for Success Snackbar (20:1359)
  console.log('\n8. Fetching design context for Success Snackbar (20:1359)...');
  const snackCtx = await fetchFigmaMCP('tools/call', {
    name: 'get_design_context',
    arguments: { nodeId: '20:1359', forceCode: true }
  }, sessionId);
  const snackCtxPath = path.join(ARTIFACT_DIR, 'figma_design_context_20_1359.json');
  fs.writeFileSync(snackCtxPath, JSON.stringify(snackCtx.result, null, 2));
  console.log(`Saved snackbar context to: ${snackCtxPath}`);

  console.log('\nAll Figma specs & screenshots downloaded successfully!');
}

run().catch(console.error);
