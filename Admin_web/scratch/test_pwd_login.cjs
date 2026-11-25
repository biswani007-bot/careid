const https = require('https');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, rejectUnauthorized: false };
    const r = https.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(body); } catch(e) { json = body; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function testPasswordLogin() {
  const payload = JSON.stringify({
    identifier: "superadmin@careid.test",
    password: "SecureSuperAdminPassword123!"
  });

  const res = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/password/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  console.log('Password login res:', res.status, JSON.stringify(res.body));
}

testPasswordLogin().catch(console.error);

