const fs = require('fs');
const https = require('https');

let cached = JSON.parse(fs.readFileSync('scratch/cached_token.json', 'utf8'));

// Test file exceeding 25MB (26MB)
const bigBuffer = Buffer.alloc(26 * 1024 * 1024, 0x41);
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

const fieldHead = '--' + boundary + '\r\nContent-Disposition: form-data; name="patientProfileId"\r\n\r\n06584c77-0109-4774-906e-f14a16db8470\r\n';
const fileHead = '--' + boundary + '\r\nContent-Disposition: form-data; name="file"; filename="large_scan.pdf"\r\nContent-Type: application/pdf\r\n\r\n';
const tail = '\r\n--' + boundary + '--\r\n';

const totalLength = Buffer.byteLength(fieldHead) + Buffer.byteLength(fileHead) + bigBuffer.length + Buffer.byteLength(tail);

const req = https.request({
  hostname: '360api.vnvision.in',
  path: '/api/v1/attachments',
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + cached.accessToken,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': totalLength,
    Accept: 'application/json'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => console.log('Large file response:', res.statusCode, b));
});

req.write(Buffer.from(fieldHead));
req.write(Buffer.from(fileHead));
req.write(bigBuffer);
req.write(Buffer.from(tail));
req.end();

