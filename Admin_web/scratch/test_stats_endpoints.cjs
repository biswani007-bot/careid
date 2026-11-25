const { apiGet } = require('./api_helper.cjs');

(async () => {
  const endpoints = [
    '/api/v1/admin/medical-records/stats',
    '/api/v1/admin/medical-records/summary',
    '/api/v1/medical-records/statistics',
    '/api/v1/medical-records/stats',
    '/api/v1/admin/dashboard/stats',
    '/api/v1/admin/dashboard/summary'
  ];

  for (const ep of endpoints) {
    const res = await apiGet(ep);
    console.log(`[GET] ${ep} -> Status ${res.status}:`, res.body?.data ? Object.keys(res.body.data) : (res.body?.message || res.status));
    if (res.status === 200 && res.body?.data) {
      console.log('   Data snippet:', JSON.stringify(res.body.data).slice(0, 200));
    }
  }
})();

