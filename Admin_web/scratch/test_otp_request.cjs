const https = require('https');

function testOtp() {
  const reqData = JSON.stringify({ phone: '+16505559876' });
  const req = https.request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    rejectUnauthorized: false
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', d);
    });
  });
  req.write(reqData);
  req.end();
}

testOtp();

