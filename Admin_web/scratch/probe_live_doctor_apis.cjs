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
  console.log('Testing Live Doctor Endpoints...');

  console.log('\n1. GET /api/v1/doctors/statistics');
  const statsRes = await request('/api/v1/doctors/statistics');
  console.log('Status:', statsRes.status);
  console.log('Body:', JSON.stringify(statsRes.body, null, 2));

  console.log('\n2. GET /api/v1/doctors?page=1&limit=10');
  const listRes = await request('/api/v1/doctors?page=1&limit=10');
  console.log('Status:', listRes.status);
  console.log('Body:', JSON.stringify(listRes.body, null, 2));

  console.log('\n3. GET /api/v1/doctors/verification/pending');
  const pendingRes = await request('/api/v1/doctors/verification/pending');
  console.log('Status:', pendingRes.status);
  console.log('Body:', JSON.stringify(pendingRes.body, null, 2));

  console.log('\n4. GET /api/v1/doctors/search?q=test');
  const searchRes = await request('/api/v1/doctors/search?q=test');
  console.log('Status:', searchRes.status);
  console.log('Body:', JSON.stringify(searchRes.body, null, 2));

  console.log('\n5. GET /api/v1/facilities?limit=100');
  const facRes = await request('/api/v1/facilities?limit=100');
  console.log('Status:', facRes.status);
  if (facRes.body && facRes.body.data) {
    console.log('Facilities count:', Array.isArray(facRes.body.data) ? facRes.body.data.length : (facRes.body.data.items ? facRes.body.data.items.length : 'unknown'));
  } else {
    console.log('Fac body:', facRes.body);
  }
})();

