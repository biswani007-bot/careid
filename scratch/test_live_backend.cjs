async function testLive() {
  try {
    const res = await fetch('https://360api.vnvision.in/api/v1/health');
    console.log('Health status:', res.status);
    const body = await res.text();
    console.log('Health response:', body);
    console.log('CORS & Security headers:');
    for (const [k, v] of res.headers.entries()) {
      if (k.toLowerCase().includes('cors') || k.toLowerCase().includes('access-control') || k.toLowerCase().includes('x-')) {
        console.log(`  ${k}: ${v}`);
      }
    }

    // Test OPTIONS preflight
    const optRes = await fetch('https://360api.vnvision.in/api/v1/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    console.log('\nPreflight OPTIONS status:', optRes.status);
    for (const [k, v] of optRes.headers.entries()) {
      if (k.toLowerCase().includes('access-control')) {
        console.log(`  ${k}: ${v}`);
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testLive();
