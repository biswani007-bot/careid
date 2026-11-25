const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function test() {
  const token = await getAdminToken();
  const now = new Date();
  const istOffsetMs = 5.5 * 3600 * 1000;
  const nowIst = new Date(now.getTime() + istOffsetMs);
  const istY = nowIst.getUTCFullYear();
  const istM = nowIst.getUTCMonth();
  const istD = nowIst.getUTCDate();

  const start7d = new Date(Date.UTC(istY, istM, istD - 6, 0, 0, 0, 0) - istOffsetMs).toISOString();
  const start30d = new Date(Date.UTC(istY, istM, istD - 29, 0, 0, 0, 0) - istOffsetMs).toISOString();
  const endToday = new Date(Date.UTC(istY, istM, istD, 23, 59, 59, 999) - istOffsetMs).toISOString();

  const exec7d = await httpRequest({
    hostname: '360api.vnvision.in',
    path: `/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(start7d)}&endDate=${encodeURIComponent(endToday)}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('Backend /reports/dashboard/executive for 7D returns:');
  console.log(JSON.stringify(exec7d.body?.data?.platformOverview, null, 2));

  const exec30d = await httpRequest({
    hostname: '360api.vnvision.in',
    path: `/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(start30d)}&endDate=${encodeURIComponent(endToday)}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('\nBackend /reports/dashboard/executive for 30D returns:');
  console.log(JSON.stringify(exec30d.body?.data?.platformOverview, null, 2));
}

test().catch(console.error);

