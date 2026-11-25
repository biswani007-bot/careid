const { getFreshToken, apiGet } = require('./api_helper.cjs');

async function main() {
  console.log('=== CAREID LIVE BACKEND DATA CONSISTENCY PROBE ===\n');

  try {
    const endpoints = [
      '/api/v1/admin/dashboard/stats',
      '/api/v1/admin/dashboard/summary',
      '/api/v1/reports/dashboard/executive',
      '/api/v1/doctors/statistics',
      '/api/v1/facilities/statistics',
      '/api/v1/admin/patients?limit=50',
      '/api/v1/admin/users?limit=50',
      '/api/v1/doctors?limit=50',
      '/api/v1/admin/medical-records?limit=10',
      '/api/v1/reports/categories',
    ];

    for (const ep of endpoints) {
      console.log(`\n>>> PROBING: GET ${ep}`);
      try {
        const res = await apiGet(ep);
        console.log(`Status: ${res.status}`);
        if (res.body) {
          if (Array.isArray(res.body)) {
            console.log(`Response is Array with length: ${res.body.length}`);
            console.log('Sample item:', JSON.stringify(res.body[0] || {}).slice(0, 150));
          } else {
            // Print keys and top-level data
            const bodyCopy = { ...res.body };
            if (Array.isArray(bodyCopy.data)) {
              console.log(`body.data is Array with length: ${bodyCopy.data.length}`);
              console.log('meta / pagination:', bodyCopy.meta || bodyCopy.pagination || 'None');
              console.log('Sample item:', JSON.stringify(bodyCopy.data[0] || {}).slice(0, 150));
            } else {
              console.log('Body:', JSON.stringify(res.body, null, 2).slice(0, 500));
            }
          }
        }
      } catch (e) {
        console.log(`Error calling ${ep}:`, e.message);
      }
    }
  } catch (err) {
    console.error('Fatal probe error:', err);
  }
}

main();
