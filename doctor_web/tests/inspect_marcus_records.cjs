const https = require('https');

function post(path, data) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(b) }));
    });
    req.end();
  });
}

async function main() {
  const otpRes = await post('/auth/otp/request', { phone: '+16505550004' });
  const challengeId = otpRes.data?.data?.challengeId;
  const verifyRes = await post('/auth/otp/verify', { challengeId, otpCode: '123456' });
  const token = verifyRes.data?.data?.accessToken;

  const records = await get('/medical-records', token);
  const items = records.data?.data || records.data || [];
  console.log(`Total records for Marcus Doe: ${items.length}`);
  items.forEach((r, i) => {
    console.log(`\n[${i+1}] ID: ${r.id}`);
    console.log(`    Title: ${r.title}`);
    console.log(`    Date: ${r.createdAt} | Encounter: ${r.encounters?.[0]?.encounterDate}`);
    console.log(`    Diagnoses: ${r.diagnoses?.map(d => d.description).join(', ')}`);
    console.log(`    Vitals: ${JSON.stringify(r.vitalSigns)}`);
  });
}

main();

