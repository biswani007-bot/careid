const https = require('https');

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

async function analyzeRecords() {
  const phone = '+16505550004';
  const otpRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ phone }));
  const challengeId = otpRes.body?.challengeId || otpRes.body?.data?.challengeId;
  const verifyRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ challengeId, otpCode: '123456' }));
  const token = verifyRes.body?.accessToken || verifyRes.body?.data?.accessToken;

  const recRes = await httpRequest({
    hostname: '360api.vnvision.in',
    path: '/api/v1/medical-records?limit=1000',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  });
  const records = Array.isArray(recRes.body) ? recRes.body : (recRes.body?.data || []);
  console.log('Total medical records returned:', records.length);

  const categories = {};
  records.forEach(r => {
    const cat = r.category || 'Unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  console.log('Categories:', categories);
}

analyzeRecords().catch(console.error);

