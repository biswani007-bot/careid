async function test(name, body) {
  try {
    const res = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const txt = await res.text();
    console.log(`[${name}] status=${res.status}:`, txt);
  } catch (e) {
    console.log(`[${name}] error:`, e.message);
  }
}

async function run() {
  await test('Empty body', {});
  await test('tools/call get_screenshot', {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_screenshot',
      arguments: { nodeId: '20:1284' }
    }
  });
  await test('get_design_context', {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_design_context',
      arguments: { nodeId: '20:1284' }
    }
  });
}

run();
