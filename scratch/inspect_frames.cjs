const fs = require('fs');

async function run() {
  const init = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } })
  });
  const sid = init.headers.get('mcp-session-id');

  const res = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sid },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_metadata', arguments: { nodeId: '0:1' } } })
  });
  const text = await res.text();
  fs.writeFileSync('scratch/full_page_metadata.txt', text);
  
  // Extract all frame names
  const frameMatches = text.match(/<frame [^>]*name="([^"]+)"[^>]*>/g) || [];
  console.log('Total frames found:', frameMatches.length);
  const adminFrames = frameMatches.filter(f => f.includes('Admin') || f.includes('Doctor'));
  console.log('Admin / Doctor frames:');
  for (const f of adminFrames) {
    console.log(f);
  }
}

run().catch(console.error);
