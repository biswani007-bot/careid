const https = require('https');

function post(path, data, token) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'POST',
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, raw: b }); }
      });
    });
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1' + path,
      method: 'GET',
      headers
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, raw: b }); }
      });
    });
    req.end();
  });
}

async function main() {
  console.log('Logging in as Marcus Doe (+16505550004)...');
  const otpRes = await post('/auth/otp/request', { phone: '+16505550004' });
  console.log('OTP Req:', otpRes.status, JSON.stringify(otpRes.data));
  const challengeId = otpRes.data?.data?.challengeId || otpRes.data?.challengeId;

  if (!challengeId) {
    console.log('No challengeId, aborting');
    return;
  }

  const verifyRes = await post('/auth/otp/verify', { challengeId, otpCode: '123456' });
  console.log('Verify:', verifyRes.status);
  const patientToken = verifyRes.data?.data?.accessToken || verifyRes.data?.accessToken;
  console.log('Patient Token acquired:', !!patientToken);

  if (!patientToken) return;

  const me = await get('/patients/me', patientToken);
  console.log('Patient /patients/me:', JSON.stringify(me.data, null, 2));

  const records = await get('/medical-records', patientToken);
  console.log('Patient /medical-records:', JSON.stringify(records.data, null, 2));

  const timeline = await get('/medical-records/timeline', patientToken);
  console.log('Patient /medical-records/timeline:', JSON.stringify(timeline.data, null, 2));
}

main();

