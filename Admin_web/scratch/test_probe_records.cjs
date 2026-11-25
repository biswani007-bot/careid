const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

function httpRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const token = await getAdminToken();

  function apiGet(path) {
    return httpRequest({
      hostname: '360api.vnvision.in',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });
  }

  console.log('1. Querying /api/v1/admin/medical-records with different limits...');
  const resLimit1 = await apiGet('/api/v1/admin/medical-records?page=1&limit=1');
  console.log('limit=1 response structure:', {
    status: resLimit1.status,
    isDataArray: Array.isArray(resLimit1.body?.data),
    dataLength: Array.isArray(resLimit1.body?.data) ? resLimit1.body.data.length : null,
    meta: resLimit1.body?.meta,
    pagination: resLimit1.body?.pagination,
    total: resLimit1.body?.total,
    rawBodyKeys: typeof resLimit1.body === 'object' ? Object.keys(resLimit1.body) : resLimit1.body
  });

  const res100 = await apiGet('/api/v1/admin/medical-records?page=1&limit=100');
  console.log('limit=100 status:', res100.status, 'meta:', res100.body?.meta, 'data length:', Array.isArray(res100.body?.data) ? res100.body.data.length : null);
})();

