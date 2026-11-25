const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';

async function mcpRequest(method, params, sessionId) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    const req = http.request('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      const newSessionId = res.headers['mcp-session-id'] || sessionId;
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const parsed = JSON.parse(line.slice(6));
              return resolve({ result: parsed, sessionId: newSessionId });
            }
          }
          const parsed = JSON.parse(data);
          resolve({ result: parsed, sessionId: newSessionId });
        } catch (e) {
          resolve({ raw: data, sessionId: newSessionId });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    const initRes = await mcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'agent', version: '1.0' }
    });
    const sessionId = initRes.sessionId;
    console.log('Session ID:', sessionId);

    // 1. Fetch Screenshot for Node 20:1368
    console.log('Fetching screenshot for Node 20:1368 (Admin Portal - Patient Profile)...');
    const shotRes = await mcpRequest('tools/call', {
      name: 'get_screenshot',
      arguments: { nodeId: '20:1368' }
    }, sessionId);

    if (shotRes.result?.result?.content) {
      for (const item of shotRes.result.result.content) {
        if (item.type === 'image' && item.data) {
          const imgPath = path.join(ARTIFACT_DIR, 'figma_patient_profile_20_1368.png');
          fs.writeFileSync(imgPath, Buffer.from(item.data, 'base64'));
          console.log('Saved screenshot to:', imgPath);
        } else if (item.type === 'text') {
          console.log('Screenshot response text:', item.text);
        }
      }
    }

    // 2. Fetch Design Context for Node 20:1368
    console.log('Fetching design context for Node 20:1368...');
    const ctxRes = await mcpRequest('tools/call', {
      name: 'get_design_context',
      arguments: { nodeId: '20:1368' }
    }, sessionId);

    const ctxPath = path.join(__dirname, 'patient_profile_design_context.json');
    fs.writeFileSync(ctxPath, JSON.stringify(ctxRes.result, null, 2));
    console.log('Saved design context to:', ctxPath);

    // 3. Save Code Item
    if (ctxRes.result?.result?.content) {
      const codeItem = ctxRes.result.result.content[0]?.text;
      if (codeItem) {
        fs.writeFileSync('scratch/figma_patient_profile_code.tsx', codeItem);
        console.log('Saved Figma generated code to scratch/figma_patient_profile_code.tsx. Length:', codeItem.length);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  }
})();
