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

async function testLogins() {
  const passwords = [
    'AdminPassword123!',
    'SuperAdmin123!',
    'Password123!',
    'Admin@123',
    'CareID@2026',
    'CareID123!'
  ];

  for (const p of passwords) {
    const res = await login('admin@careid.test', p);
    console.log(`admin@careid.test with '${p}': status ${res.status}`);
    if (res.status === 200) {
      console.log('Success! Token:', res.body.data?.accessToken?.slice(0, 30));
      break;
    }
  }
}

testLogins().catch(console.error);

