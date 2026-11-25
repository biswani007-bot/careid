const { getFreshToken, apiGet } = require('./api_helper.cjs');

async function main() {
  console.log('--- TESTING EXECUTIVE & RECORDS QUERY PARAMS ---');

  // Test executive endpoint with facilityId
  const facs = await apiGet('/api/v1/facilities');
  const facList = facs.body?.data || facs.body || [];
  const testFac = facList[0];
  console.log('Test facility:', testFac?.id, testFac?.name);

  if (testFac) {
    const execFac = await apiGet(`/api/v1/reports/dashboard/executive?facilityId=${testFac.id}`);
    console.log('Executive with facilityId:', execFac.body?.data?.platformOverview);
  }

  // Test medical-records with dates
  const today = new Date();
  const start7d = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endNow = today.toISOString();
  const recs7d = await apiGet(`/api/v1/admin/medical-records?startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endNow)}&limit=1`);
  console.log('Medical records 7D meta:', recs7d.body?.meta);

  const recsAll = await apiGet('/api/v1/admin/medical-records?limit=1');
  console.log('Medical records ALL meta:', recsAll.body?.meta);
}

main().catch(console.error);
