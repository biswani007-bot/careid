const { apiGet } = require('./api_helper.cjs');

(async () => {
  console.log('Testing supported backend query parameters on /api/v1/admin/medical-records...');

  // 1. Check max limit supported
  const testLimits = [50, 100, 200, 305, 500];
  for (const lim of testLimits) {
    const res = await apiGet(`/api/v1/admin/medical-records?page=1&limit=${lim}`);
    const count = Array.isArray(res.body?.data) ? res.body.data.length : null;
    console.log(`limit=${lim} -> Status ${res.status}, items returned: ${count}, meta.totalItems: ${res.body?.meta?.totalItems}`);
  }

  // 2. Test status filter
  const resFinal = await apiGet('/api/v1/admin/medical-records?page=1&limit=5&status=FINAL');
  console.log('status=FINAL -> count:', resFinal.body?.data?.length, 'meta:', resFinal.body?.meta);

  const resDraft = await apiGet('/api/v1/admin/medical-records?page=1&limit=5&status=DRAFT');
  console.log('status=DRAFT -> count:', resDraft.body?.data?.length, 'meta:', resDraft.body?.meta);

  // 3. Test q / search
  const resQ = await apiGet('/api/v1/admin/medical-records?page=1&limit=5&q=Cath');
  console.log('q=Cath -> count:', resQ.body?.data?.length, 'meta:', resQ.body?.meta);

  // 4. Test startDate / endDate
  const resDates = await apiGet('/api/v1/admin/medical-records?page=1&limit=5&startDate=2026-11-01&endDate=2026-11-13');
  console.log('startDate=2026-11-01&endDate=2026-11-13 -> count:', resDates.body?.data?.length, 'meta:', resDates.body?.meta);
})();
