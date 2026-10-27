
async function mcpRequest(method, params = {}) {
  // Try sending via standard fetch
  const res = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  console.log('1. Initializing MCP connection...');
  const initRes = await mcpRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'antigravity-client', version: '1.0' }
  });
  console.log('Init response:', JSON.stringify(initRes, null, 2));

  console.log('\n2. Listing tools...');
  const toolsRes = await mcpRequest('tools/list', {});
  console.log('Tools response:', JSON.stringify(toolsRes, null, 2));

  console.log('\n3. Getting metadata for node 20:1284 (Admin Portal - User Action Dialogs)...');
  const metaRes = await mcpRequest('tools/call', {
    name: 'get_metadata',
    arguments: { nodeId: '20:1284' }
  });
  console.log('Metadata result:', JSON.stringify(metaRes, null, 2));
}

main().catch(err => console.error('Error:', err));
