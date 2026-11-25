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

  const res = await apiGet('/api/v1/admin/medical-records?page=1&limit=10');
  console.log('Sample medical records timestamps:');
  const records = res.body?.data || [];
  for (const r of records) {
    console.log(`- ID: ${r.id} | createdAt: ${r.createdAt} | recordDate: ${r.recordDate || r.date} | patientId: ${r.patientProfileId || r.patientId} | facility: ${r.facilityName || r.facilityId}`);
  }

  // Test date formats on /api/v1/admin/medical-records
  const dateFormats = [
    '2026-11-01',
    '2026-11-01T00:00:00.000Z',
    '2026-11-14',
  ];
  for (const df of dateFormats) {
    const testRes = await apiGet(`/api/v1/admin/medical-records?page=1&limit=1&startDate=${df}`);
    console.log(`Query startDate=${df} -> totalItems: ${testRes.body?.meta?.totalItems}`);
  }
}

main().catch(console.error);

