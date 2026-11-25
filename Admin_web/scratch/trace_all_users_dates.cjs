const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function main() {
  const token = await getAdminToken();
  async function apiGet(path) {
    return await httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });
  }

  const usersRes = await apiGet('/api/v1/admin/users?limit=100');
  const users = usersRes.body?.data?.data || [];
  console.log('Total platform users:', users.length);
  
  // Group by date in IST (Asia/Kolkata)
  function toISTDate(isoString) {
    if (!isoString) return 'No-Date';
    const d = new Date(isoString);
    const istTime = new Date(d.getTime() + 5.5 * 3600 * 1000);
    return istTime.toISOString().split('T')[0];
  }

  console.log('\nUsers breakdown by role and IST registration date:');
  const userDateCounts = {};
  for (const u of users) {
    const istDate = toISTDate(u.createdAt);
    const role = (u.roles && u.roles[0]) || 'UNKNOWN';
    const key = `${istDate} (${role})`;
    userDateCounts[key] = (userDateCounts[key] || 0) + 1;
  }
  console.table(userDateCounts);

  console.log('\nUsers registered on 2026-11-14:');
  for (const u of users) {
    const istDate = toISTDate(u.createdAt);
    if (istDate === '2026-11-14') {
      console.log(`- ${u.id.slice(0, 8)} | ${u.phone || u.email} | role: ${u.roles?.join(',')} | createdAt: ${u.createdAt}`);
    }
  }
}

main().catch(console.error);
