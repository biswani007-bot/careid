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
  const doctorId = '7c8fd004-cba1-4a72-9db6-437fc6d2baed';

  console.log('1. GET /api/v1/doctors/' + doctorId);
  const docRes = await request('/api/v1/doctors/' + doctorId);
  console.log('Status:', docRes.status);
  console.log('Body:', JSON.stringify(docRes.body, null, 2));

  console.log('\n2. GET /api/v1/doctors/search?q=Julian');
  const searchRes = await request('/api/v1/doctors/search?q=Julian');
  console.log('Status:', searchRes.status, 'Count:', searchRes.body?.data?.length);

  console.log('\n3. GET /api/v1/doctors?verificationStatus=PENDING');
  const filterRes1 = await request('/api/v1/doctors?verificationStatus=PENDING');
  console.log('Status:', filterRes1.status, 'Count:', filterRes1.body?.data?.length);

  console.log('\n4. GET /api/v1/doctors?status=PENDING');
  const filterRes2 = await request('/api/v1/doctors?status=PENDING');
  console.log('Status:', filterRes2.status, 'Count:', filterRes2.body?.data?.length);

  console.log('\n5. GET /api/v1/doctors/' + doctorId + '/history');
  const histRes = await request('/api/v1/doctors/' + doctorId + '/history');
  console.log('Status:', histRes.status, 'Data:', histRes.body?.data);

  console.log('\n6. GET /api/v1/doctors/' + doctorId + '/documents');
  const docDocsRes = await request('/api/v1/doctors/' + doctorId + '/documents');
  console.log('Status:', docDocsRes.status, 'Data:', docDocsRes.body?.data);

  console.log('\n7. GET /api/v1/facilities');
  const facs = await request('/api/v1/facilities');
  console.log('Status:', facs.status, 'Facilities:', JSON.stringify(facs.body?.data, null, 2));
})();

