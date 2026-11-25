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

  const res = await apiGet('/api/v1/reports/analytics/modules/PATIENT');
  console.log('PATIENT analytics status:', res.status, 'data:', JSON.stringify(res.body));

  const resDate = await apiGet('/api/v1/reports/analytics/modules/PATIENT?startDate=2026-11-01&endDate=2026-11-14');
  console.log('PATIENT analytics with dates:', resDate.status, 'data:', JSON.stringify(resDate.body));
}

main().catch(console.error);

