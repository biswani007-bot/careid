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

  const now = new Date();
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endToday = now.toISOString();

  // Test q=Cardiology with date range
  const r1 = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&q=Cardiology&startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`);
  console.log('Records q=Cardiology + 7D meta:', r1.body?.meta);

  // Test q=Surgery with date range
  const r2 = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&q=Surgery`);
  console.log('Records q=Surgery meta:', r2.body?.meta);

  // Test facility search via q
  const r3 = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&q=CAPITAL`);
  console.log('Records q=CAPITAL meta:', r3.body?.meta);

  const r4 = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&q=Metro`);
  console.log('Records q=Metro meta:', r4.body?.meta);
}

main().catch(console.error);

