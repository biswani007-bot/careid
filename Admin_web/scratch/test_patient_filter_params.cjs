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

  const pFac = await apiGet('/api/v1/admin/patients?page=1&limit=1&facilityId=f12c37e8-cfc9-4896-992c-82d954905c46');
  console.log('Patients with facilityId:', pFac.status, JSON.stringify(pFac.body));

  const pDept = await apiGet('/api/v1/admin/patients?page=1&limit=1&department=Cardiology');
  console.log('Patients with department:', pDept.status, JSON.stringify(pDept.body));
}

main().catch(console.error);

