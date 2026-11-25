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

async function checkAll305() {
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
  console.log('Total records:', records.length);

  const sampleTitles = new Set();
  records.forEach(r => {
    sampleTitles.add(r.title);
  });
  console.log('Unique titles:', Array.from(sampleTitles));

  // Check if any record has dental or tooth or teeth or oral
  const dental = records.filter(r => JSON.stringify(r).toLowerCase().includes('dent') || JSON.stringify(r).toLowerCase().includes('oral'));
  console.log('Records matching dent/oral:', dental.length);
  dental.forEach(d => console.log('  Dental match:', d.id, d.title));

  const vision = records.filter(r => JSON.stringify(r).toLowerCase().includes('vis') || JSON.stringify(r).toLowerCase().includes('eye') || JSON.stringify(r).toLowerCase().includes('retin'));
  console.log('Records matching vis/eye/retin:', vision.length);
  vision.forEach(v => console.log('  Vision match:', v.id, v.title));
}

checkAll305().catch(console.error);

