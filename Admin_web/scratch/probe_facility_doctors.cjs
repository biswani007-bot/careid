const fs = require('fs');
const https = require('https');

const tokenData = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));
const token = tokenData.accessToken || tokenData.token;

function request(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: '360api.vnvision.in',
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const facId = '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb';
  console.log('GET /api/v1/facilities/' + facId + '/doctors');
  const facDocs = await request('/api/v1/facilities/' + facId + '/doctors');
  console.log('Status:', facDocs.status, 'Data:', JSON.stringify(facDocs.body, null, 2));

  console.log('\nGET /api/v1/facilities/ffd6cadd-4a74-4129-86c0-35e643fd3205/doctors');
  const facDocs2 = await request('/api/v1/facilities/ffd6cadd-4a74-4129-86c0-35e643fd3205/doctors');
  console.log('Status:', facDocs2.status, 'Data:', JSON.stringify(facDocs2.body, null, 2));
})();

