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

  for (const mod of ['FACILITY', 'REFERRALS', 'OCR', 'DOCTOR', 'RECORD', 'APPOINTMENT']) {
    const res = await apiGet(`/api/v1/reports/analytics/modules/${mod}`);
    console.log(`Module ${mod} status: ${res.status} data:`, JSON.stringify(res.body?.data || res.body));
  }
}

main().catch(console.error);

