async function run() {
  const initBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'antigravity-client', version: '1.0.0' }
    }
  };

  const res = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify(initBody)
  });

  console.log('Init status:', res.status);
  console.log('Init headers:', Object.fromEntries(res.headers.entries()));
  const text = await res.text();
  console.log('Init body:', text);

  // Check if session ID or cookie was returned
  const sessionId = res.headers.get('mcp-session-id') || res.headers.get('set-cookie');
  console.log('Session identifier:', sessionId);

  // Now call tools/call for get_metadata on node 20:1284
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
  };
  if (res.headers.get('mcp-session-id')) {
    headers['mcp-session-id'] = res.headers.get('mcp-session-id');
  }

  const callRes = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_metadata',
        arguments: { nodeId: '20:1284' }
      }
    })
  });
  console.log('Call status:', callRes.status);
  const callText = await callRes.text();
  console.log('Call result:', callText.substring(0, 500));
}

run().catch(console.error);
