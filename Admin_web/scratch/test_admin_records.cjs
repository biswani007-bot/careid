const tokenHelper = require('./token_helper.cjs');

async function test() {
  const token = await tokenHelper.getAdminToken();
  const testUrls = [
    '/api/v1/admin/medical-records?page=1&limit=1',
    '/api/v1/admin/medical-records?page=1&limit=10',
    '/api/v1/admin/medical-records?page=1&limit=20',
    '/api/v1/admin/medical-records?page=1&limit=100',
    '/api/v1/admin/medical-records?page=1',
    '/api/v1/medical-records?page=1&limit=10',
    '/api/v1/medical-records/timeline?page=1&limit=10',
    '/api/v1/medical-records/search?q=test',
    '/api/v1/reports/timeline?page=1&limit=10'
  ];

  for (const u of testUrls) {
    const res = await fetch('https://360api.vnvision.in' + u, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(u, res.status);
    if (res.status === 200) {
      const data = await res.json();
      console.log('  Keys:', Object.keys(data), 'meta:', data.meta, 'total:', data.total || data.meta?.totalItems);
    } else {
      const text = await res.text();
      console.log('  Response:', text.slice(0, 100));
    }
  }
}

test().catch(console.error);

