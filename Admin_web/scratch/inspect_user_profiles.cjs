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

async function inspectUserProfiles() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  const ids = [
    'fa502f2e-332c-4ec0-b6aa-83713216ec88', // Doctor
    'fd2a7ed3-7c81-496e-82b8-beefbdc9a8e6', // Patient
    '554f1941-f337-4a98-a8b6-d4409e1cfa04', // Admin
    'bc6f6875-434c-4050-b893-07343cc27986'  // Super Admin
  ];

  for (const id of ids) {
    const res = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/admin/users/${id}`,
      method: 'GET',
      headers
    });
    console.log(`\nUser [${id}]:`, JSON.stringify(res.body.data || res.body, null, 2));
  }
}

inspectUserProfiles().catch(console.error);

