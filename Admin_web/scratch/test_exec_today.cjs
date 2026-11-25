const { getAdminToken, httpRequest } = require('./token_helper.cjs');

async function test() {
  const token = await getAdminToken();
  // Call /api/v1/admin/dashboard/executive with startDate and endDate
  const now = new Date();
  const istOffsetMs = 5.5 * 3600 * 1000;
  const nowIst = new Date(now.getTime() + istOffsetMs);
  const istY = nowIst.getUTCFullYear();
  const istM = nowIst.getUTCMonth();
  const istD = nowIst.getUTCDate();

  const startToday = new Date(Date.UTC(istY, istM, istD, 0, 0, 0, 0) - istOffsetMs).toISOString();
  const endToday = new Date(Date.UTC(istY, istM, istD, 23, 59, 59, 999) - istOffsetMs).toISOString();

  const execToday = await httpRequest({
    hostname: '360api.vnvision.in',
    path: `/api/v1/reports/dashboard/executive?startDate=${encodeURIComponent(startToday)}&endDate=${encodeURIComponent(endToday)}`,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  console.log('Backend /reports/dashboard/executive for Today returns:');
  console.log(JSON.stringify(execToday.body?.data?.platformOverview, null, 2));
}

test().catch(console.error);

