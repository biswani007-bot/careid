const https = require('https');

function login(identifier, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ identifier, password });
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/auth/password/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testPasswordLogin() {
  const passwords = [
    'TempPassword123!',
    'Password123!',
    'AdminPassword123!',
    'ResetPassword123!',
    'CareID123!'
  ];

  for (const p of passwords) {
    const res = await login('+16505550999', p);
    console.log(`+16505550999 with '${p}': status ${res.status} (${res.body?.message || ''})`);
  }
}

testPasswordLogin().catch(console.error);

