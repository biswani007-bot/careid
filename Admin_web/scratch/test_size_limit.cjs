const https = require('https');
const fs = require('fs');
const { getFreshToken } = require('./api_helper.cjs');

(async () => {
  const token = await getFreshToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a';
  
  // Let's test a 16MB buffer to see if backend rejects >15MB
  console.log('Testing 16MB file upload...');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="patientProfileId"\r\n\r\n${patientProfileId}\r\n--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nLAB_RESULT\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="large.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  
  const targetSize = 16 * 1024 * 1024;
  const paddingSize = targetSize - head.length - tail.length;
  const padding = Buffer.alloc(paddingSize, 0x20); // spaces
  
  const totalLength = head.length + padding.length + tail.length;
  console.log('Total multipart length:', (totalLength / (1024 * 1024)).toFixed(2), 'MB');

  const req = https.request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/attachments',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': totalLength,
      Accept: 'application/json'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log('Status for 16MB upload:', res.statusCode);
      console.log('Body:', b);
    });
  });
  req.on('error', err => console.log('Error:', err.message));
  req.write(head);
  req.write(padding);
  req.write(tail);
  req.end();
})();

