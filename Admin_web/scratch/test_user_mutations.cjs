const fs = require('fs');
const https = require('https');
const tokenData = JSON.parse(fs.readFileSync('scratch/cached_admin_token.json', 'utf8'));
const token = tokenData.token;

function apiRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = https.request('https://360api.vnvision.in' + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ method, path, status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ method, path, status: res.statusCode, text: data }); }
      });
    });
    req.on('error', err => resolve({ method, path, error: err.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const dummyUserId = '00000000-0000-0000-0000-000000000000';
  const testUserId = 'd17aeaac-d25b-47e2-b853-85b18f2663f0'; // User #8 (+16505550011)

  console.log('Testing User Mutation & Action Endpoints...');

  // 1. Generic Add User
  const addRes = await apiRequest('POST', '/api/v1/admin/users', { phone: '+19999999999', role: 'PATIENT' });
  console.log('POST /api/v1/admin/users (Add User):', addRes.status, addRes.body?.message || addRes.text);

  // 2. Generic Edit User
  const editRes = await apiRequest('PUT', '/api/v1/admin/users/' + testUserId, { phone: '+16505550011' });
  console.log('PUT /api/v1/admin/users/:id (Edit User):', editRes.status, editRes.body?.message || editRes.text);

  // 3. User Status Update (Activate / Deactivate)
  const statusRes = await apiRequest('PUT', `/api/v1/admin/users/${testUserId}/status`, { status: 'ACTIVE' });
  console.log('PUT /api/v1/admin/users/:id/status:', statusRes.status, statusRes.body?.message || statusRes.text);

  // 4. User Roles Update
  const rolesRes = await apiRequest('PUT', `/api/v1/admin/users/${testUserId}/roles`, { roles: ['PATIENT'] });
  console.log('PUT /api/v1/admin/users/:id/roles:', rolesRes.status, rolesRes.body?.message || rolesRes.text);

  // 5. User Verify Endpoint
  const verifyRes = await apiRequest('POST', `/api/v1/admin/users/${testUserId}/verify`, {});
  console.log('POST /api/v1/admin/users/:id/verify:', verifyRes.status, verifyRes.body?.message || verifyRes.text);

  // 6. User Suspend Endpoint
  const suspendRes = await apiRequest('POST', `/api/v1/admin/users/${testUserId}/suspend`, {});
  console.log('POST /api/v1/admin/users/:id/suspend:', suspendRes.status, suspendRes.body?.message || suspendRes.text);

  // 7. User Restore Endpoint
  const restoreRes = await apiRequest('POST', `/api/v1/admin/users/${testUserId}/restore`, {});
  console.log('POST /api/v1/admin/users/:id/restore:', restoreRes.status, restoreRes.body?.message || restoreRes.text);
}

run();
