const http = require('http');
const fs = require('fs');

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

    // Get metadata for admin page 20:55
    const metaRes = await mcpRequest('tools/call', {
      name: 'get_metadata',
      arguments: { nodeId: '20:55' }
    }, sessionId);
    
    const textContent = metaRes.result?.result?.content?.map(c => c.text).join('\n') || '';
    fs.writeFileSync('scratch/admin_page_metadata.xml', textContent);
    console.log('Saved admin page metadata. Length:', textContent.length);

    // Search for "Patient Profile" in metadata
    const regex = /<frame\s+id="([^"]+)"\s+name="([^"]*)"/gi;
    let match;
    console.log('\nTop-level frames on admin page:');
    while ((match = regex.exec(textContent)) !== null) {
      if (match[2].toLowerCase().includes('patient') || match[2].toLowerCase().includes('profile') || match[2].toLowerCase().includes('admin portal')) {
        console.log(`Node ID: ${match[1]}, Name: ${match[2]}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
