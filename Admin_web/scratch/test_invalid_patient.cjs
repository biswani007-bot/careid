const { getFreshToken } = require('./api_helper.cjs');
const https = require('https');

(async () => {
  const token = await getFreshToken();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="patientProfileId"\r\n\r\n00000000-0000-0000-0000-000000000000\r\n--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nLAB_RESULT\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n186\n%%EOF\r\n--${boundary}--\r\n`);
  
  const req = https.request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/attachments',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': head.length,
      Accept: 'application/json'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log('Status for nonexistent patientProfileId:', res.statusCode);
      console.log('Body:', b);
    });
  });
  req.write(head);
  req.end();
})();

