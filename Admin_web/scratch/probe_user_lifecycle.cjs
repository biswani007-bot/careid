const fs = require('fs');
const token = JSON.parse(fs.readFileSync('scratch/cached_token.json')).accessToken;
const testUserId = 'fda226cc-1c4f-4292-8893-c98aab723e34';

async function req(name, url, method, body) {
  console.log(`\n=== ${name}: ${method} ${url} ===`);
  const opts = {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  console.log('Status:', res.status, res.statusText);
  try {
    const json = await res.json();
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch {
    console.log('Response text:', await res.text());
  }
}

(async () => {
  const BASE = 'https://360api.vnvision.in';

  // 1. Get Details
  await req('Get Test User Details', `${BASE}/api/v1/admin/users/${testUserId}`, 'GET');

  // 2. Update Status to INACTIVE
  await req('Update Status to INACTIVE', `${BASE}/api/v1/admin/users/${testUserId}/status`, 'PUT', {
    status: 'INACTIVE'
  });

  // 3. Update Status back to ACTIVE
  await req('Update Status to ACTIVE', `${BASE}/api/v1/admin/users/${testUserId}/status`, 'PUT', {
    status: 'ACTIVE'
  });

  // 4. Update Roles
  await req('Update Roles', `${BASE}/api/v1/admin/users/${testUserId}/roles`, 'PUT', {
    roles: ['STAFF', 'ADMIN']
  });

  // 5. Password Reset
  await req('Password Reset', `${BASE}/api/v1/admin/users/${testUserId}/reset-password`, 'POST', {
    newPassword: 'ResetStaffPassword456!'
  });

  // 6. Delete / Block User
  await req('Soft Delete / Block User', `${BASE}/api/v1/admin/users/${testUserId}`, 'DELETE');

  // 7. Restore User
  await req('Restore User', `${BASE}/api/v1/admin/users/${testUserId}/restore`, 'POST');

  // 8. Final check details
  await req('Final Check Details', `${BASE}/api/v1/admin/users/${testUserId}`, 'GET');
})();

