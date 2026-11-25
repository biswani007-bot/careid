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

async function testProfileLookups() {
  const token = (require('./cached_admin_token.json')).token;
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  // 1. Patient lookup
  const res1 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/patients/787e5187-7859-4320-bb1a-465a57dd086a',
    method: 'GET',
    headers
  });
  console.log('Patient profile:', res1.status, JSON.stringify(res1.body.data || res1.body, null, 2));

  // 2. Doctor lookup
  const res2 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/1f06067b-e229-4707-84e2-afa27da2e4cd',
    method: 'GET',
    headers
  });
  console.log('Doctor profile:', res2.status, JSON.stringify(res2.body.data || res2.body, null, 2));
}

testProfileLookups().catch(console.error);

