const https = require('https');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'C:/Users/biswa/.gemini/antigravity/brain/e0785a94-53fe-4f28-b816-f2efe4edf49e/scratch/cached_token.json';
const tokenData = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8'));

function callApi(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(raw), raw });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', err => resolve({ error: err.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testAll() {
  console.log('Testing GET /api/v1/doctors/statistics ...');
  const stats = await callApi('/api/v1/doctors/statistics');
  console.log('Stats status:', stats.status);
  console.log('Stats body:', JSON.stringify(stats.json || stats.raw, null, 2));

  console.log('\nTesting GET /api/v1/doctors ...');
  const docs = await callApi('/api/v1/doctors');
  console.log('Docs status:', docs.status);
  console.log('Docs body (sample):', JSON.stringify(docs.json || docs.raw, null, 2).substring(0, 1500));

  console.log('\nTesting GET /api/v1/doctors/verification/pending ...');
  const pending = await callApi('/api/v1/doctors/verification/pending');
  console.log('Pending status:', pending.status);
  console.log('Pending body (sample):', JSON.stringify(pending.json || pending.raw, null, 2).substring(0, 500));

  console.log('\nTesting GET /api/v1/doctors/search?q=a ...');
  const search = await callApi('/api/v1/doctors/search?q=a');
  console.log('Search status:', search.status);
  console.log('Search body (sample):', JSON.stringify(search.json || search.raw, null, 2).substring(0, 500));
}

testAll();

