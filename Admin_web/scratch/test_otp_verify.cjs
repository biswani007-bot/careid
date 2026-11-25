const https = require('https');

function verifyOtp(challengeId, otpCode) {
  const reqData = JSON.stringify({ challengeId, otpCode });
  const req = https.request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
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

verifyOtp('d7a8750d-6969-4df7-81c1-885337e3c7d9', '123456');

