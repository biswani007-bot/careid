const https = require('https');
const fs = require('fs');

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

async function getLiveToken() {
  const phones = ['+16505550002', '+16505550001'];
  for (const phone of phones) {
    try {
      const reqData = JSON.stringify({ phone });
      const otpRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/request',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqData) }
      }, reqData);
      const challengeId = otpRes.body.data?.challengeId;
      if (!challengeId) continue;

      const verifyData = JSON.stringify({ challengeId, otpCode: '123456' });
      const verifyRes = await httpRequest({
        hostname: '360api.vnvision.in',
        path: '/api/v1/auth/otp/verify',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(verifyData) }
      }, verifyData);
      if (verifyRes.body.data?.accessToken) {
        return verifyRes.body.data.accessToken;
      }
    } catch (e) {}
  }
  return null;
}

async function run() {
  console.log('Authenticating with live backend...');
  const token = await getLiveToken();
  console.log('Token acquired:', token ? token.slice(0, 20) + '...' : 'NONE');

  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. GET /api/v1/admin/users
  console.log('\n--- 1. Testing GET /api/v1/admin/users ---');
  const res1 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users',
    method: 'GET',
    headers
  });
  console.log('Status:', res1.status);
  console.log('Response body structure:', typeof res1.body, Array.isArray(res1.body) ? `Array[${res1.body.length}]` : Object.keys(res1.body));
  fs.writeFileSync('scratch/live_users_response.json', JSON.stringify(res1.body, null, 2), 'utf8');

  // Let's print the first 3 users in detail
  const users = res1.body.data || res1.body;
  if (Array.isArray(users)) {
    console.log(`Found ${users.length} users. First 3 users:`);
    console.log(JSON.stringify(users.slice(0, 3), null, 2));
  } else {
    console.log('Body:', JSON.stringify(res1.body).slice(0, 400));
  }

  // 2. Test pagination and query params
  console.log('\n--- 2. Testing GET /api/v1/admin/users with params ---');
  const res2 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?page=1&limit=5',
    method: 'GET',
    headers
  });
  console.log('Status with page=1&limit=5:', res2.status);
  console.log('Response structure:', typeof res2.body, Object.keys(res2.body || {}));
  if (res2.body.meta) {
    console.log('Meta:', res2.body.meta);
  }

  // 3. Test filter by status
  console.log('\n--- 3. Testing GET /api/v1/admin/users?status=ACTIVE ---');
  const res3 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?status=ACTIVE',
    method: 'GET',
    headers
  });
  console.log('Status with status=ACTIVE:', res3.status);
  const activeUsers = res3.body.data || res3.body;
  console.log('Active users count:', Array.isArray(activeUsers) ? activeUsers.length : 'not array');

  // 4. Test search with q
  console.log('\n--- 4. Testing GET /api/v1/admin/users?q=650 ---');
  const res4 = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/admin/users?q=650',
    method: 'GET',
    headers
  });
  console.log('Status with q=650:', res4.status);
  const searchUsers = res4.body.data || res4.body;
  console.log('Search matches:', Array.isArray(searchUsers) ? searchUsers.length : 'not array');

  // 5. If we have a user, test GET /api/v1/admin/users/:id
  if (Array.isArray(users) && users.length > 0) {
    const firstUserId = users[0].id;
    console.log(`\n--- 5. Testing GET /api/v1/admin/users/${firstUserId} ---`);
    const res5 = await httpRequest({
      hostname: '360api.vnvision.in',
      path: `/api/v1/admin/users/${firstUserId}`,
      method: 'GET',
      headers
    });
    console.log('Single user status:', res5.status);
    console.log('Single user body:', JSON.stringify(res5.body, null, 2));
  }
}

run().catch(console.error);
