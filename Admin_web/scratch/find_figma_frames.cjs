const fs = require('fs');

async function main() {
  const init = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } })
  });
  const sid = init.headers.get('mcp-session-id');

  const res = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'mcp-session-id': sid },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_metadata', arguments: {} } })
  });
  const text = await res.text();
  fs.writeFileSync('scratch/metadata_dump.txt', text);
  console.log('Saved metadata dump, length:', text.length);

  // Parse lines starting with <frame or <canvas
  const lines = text.split('\n');
  for (const line of lines.slice(0, 30)) {
    if (line.includes('<frame') || line.includes('Currently selected')) {
      console.log(line);
    }
  }
}

main().catch(console.error);
