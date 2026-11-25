const fs = require('fs');
const path = require('path');

const tokenPath = path.join(__dirname, 'cached_token.json');
let token = JSON.parse(fs.readFileSync(tokenPath, 'utf8')).accessToken;

async function probe(title, url, method = 'GET', body = null) {
  console.log(`\n--- [${method}] ${title} ---`);
  console.log('URL:', url);
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', JSON.stringify(json, null, 2).slice(0, 1000));
      return { status: res.status, data: json };
    } catch {
      console.log('Response Text:', text.slice(0, 500));
      return { status: res.status, text };
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
    return null;
  }
}

(async () => {
  const BASE = 'https://360api.vnvision.in';

  // 1. Dashboard summary
  await probe('Dashboard Summary', `${BASE}/api/v1/admin/dashboard/summary`);

  // 2. Dashboard stats
  await probe('Dashboard Stats', `${BASE}/api/v1/admin/dashboard/stats`);

  // 3. Admin Users List
  const listRes = await probe('Admin Users List', `${BASE}/api/v1/admin/users?page=1&limit=10`);

  // 4. Admin Users with Search
  await probe('Admin Users Search (superadmin)', `${BASE}/api/v1/admin/users?search=superadmin`);

  // 5. Admin Users by Role
  await probe('Admin Users by Role (SUPER_ADMIN)', `${BASE}/api/v1/admin/users?role=SUPER_ADMIN`);

  // 6. Admin Users by Status
  await probe('Admin Users by Status (ACTIVE)', `${BASE}/api/v1/admin/users?status=ACTIVE`);

  // 7. Roles List
  await probe('RBAC Roles List', `${BASE}/api/v1/admin/roles`);

  // 8. Permissions List
  await probe('Permissions List', `${BASE}/api/v1/admin/permissions`);

  // 9. Single User Details (if a user exists)
  if (listRes?.data?.data && Array.isArray(listRes.data.data) && listRes.data.data.length > 0) {
    const firstUser = listRes.data.data[0];
    console.log('Found user for detail check:', firstUser.id, firstUser.phone || firstUser.email);
    await probe('Single User Details', `${BASE}/api/v1/admin/users/${firstUser.id}`);
  } else if (listRes?.data && Array.isArray(listRes.data) && listRes.data.length > 0) {
    const firstUser = listRes.data[0];
    console.log('Found user for detail check:', firstUser.id, firstUser.phone || firstUser.email);
    await probe('Single User Details', `${BASE}/api/v1/admin/users/${firstUser.id}`);
  }

  // 10. Audit Logs
  await probe('Admin Audit Logs', `${BASE}/api/v1/admin/audit-logs?page=1&limit=5`);

  // 11. Auth Sessions
  await probe('Auth Sessions', `${BASE}/api/v1/auth/sessions`);
})();

