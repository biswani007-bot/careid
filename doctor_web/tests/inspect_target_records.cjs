const https = require('https');

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
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.end();
  });
}

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
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function inspect() {
  const adminOtp = await post('/auth/otp/request', { phone: '+16505550002' });
  const adminVer = await post('/auth/otp/verify', { challengeId: adminOtp.data.challengeId, otpCode: '123456' });
  const token = adminVer.data.accessToken;

  const targetIds = [
    '68d786a3-8681-4893-a58d-7125081ef2a4', // Annual Routine Health Checkup
    '66173ade-65c2-493c-9d61-48e6ebb2999b', // Cardiology Consultation & Diagnostic Workup
    '2c992774-feb0-4d0a-8a0c-c64860d8868e', // Automated Staging Verification Record
    'dec25303-5f95-4418-ba01-83ef40b487b0', // Routine Health Checkup
  ];

  for (const id of targetIds) {
    const rec = await get('/admin/medical-records/' + id, token);
    console.log('Record ID:', id);
    console.log(JSON.stringify(rec.data || rec, null, 2));
    console.log('--------------------------------------------------');
  }
}

inspect();

