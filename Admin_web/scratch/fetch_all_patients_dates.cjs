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

  // Fetch with limit=1 for offsets 1 to 23
  const patients = [];
  for (let page = 1; page <= 25; page++) {
    const res = await apiGet(`/api/v1/admin/patients?page=${page}&limit=1`);
    if (res.status === 200 && res.body?.data?.[0]) {
      const p = res.body.data[0];
      patients.push({ page, id: p.id, patientNumber: p.patientNumber, createdAt: p.createdAt, updatedAt: p.updatedAt });
    } else {
      console.log(`Page ${page} status: ${res.status}`);
    }
  }

  console.log(`\nSuccessfully fetched ${patients.length} patient profiles:`);
  console.table(patients);
}

main().catch(console.error);

