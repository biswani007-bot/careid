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

  const facRes = await apiGet('/api/v1/facilities');
  const facilities = facRes.body?.data || [];

  for (const f of facilities) {
    const res = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${f.id}`);
    console.log(`Facility "${f.name}" (${f.id}):`);
    console.log('  Overview:', JSON.stringify(res.body?.data?.platformOverview));
  }
}

main().catch(console.error);

