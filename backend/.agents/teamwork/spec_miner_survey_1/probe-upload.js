const fs = require('fs');
const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTUwMmYyZS0zMzJjLTRlYzAtYjZhYS04MzcxMzIxNmVjODgiLCJwaG9uZSI6IisxNjUwNTU1MDAwMyIsInNlc3Npb25JZCI6IjFmMGE2NjIyLWVjNjAtNDM2MS04YTgzLTgwNzMwOWFiYzUyNyIsInJvbGVzIjpbIkRPQ1RPUiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnByb2ZpbGUiLCJyZWFkOnJlcG9ydHMiLCJ3cml0ZTpyZXBvcnRzIiwicmVhZDpoZWFsdGgtY2FyZCIsInZlcmlmeTpoZWFsdGgtY2FyZCJdLCJpYXQiOjE3OTQyMjcyMDUsImV4cCI6MTc5NDIyODEwNX0.p1igKws9nqasPHFETi8Y68NwTz2WUvC_zDqsmyMV_0g';

const filePath = 'C:/Users/PABANI/Downloads/sample.pdf';
if (!fs.existsSync(filePath)) {
  console.log('sample.pdf not found at ' + filePath);
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
const crlf = '\r\n';

const part1 = Buffer.from(
  '--' + boundary + crlf +
  'Content-Disposition: form-data; name="patientProfileId"' + crlf + crlf +
  '787e5187-7859-4320-bb1a-465a57dd086a' + crlf +
  '--' + boundary + crlf +
  'Content-Disposition: form-data; name="category"' + crlf + crlf +
  'LAB_REPORT' + crlf +
  '--' + boundary + crlf +
  'Content-Disposition: form-data; name="file"; filename="sample.pdf"' + crlf +
  'Content-Type: application/pdf' + crlf + crlf
);

const part2 = Buffer.from(crlf + '--' + boundary + '--' + crlf);
const fullBody = Buffer.concat([part1, fileBuffer, part2]);

const req = https.request('https://360api.vnvision.in/api/v1/attachments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json',
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': fullBody.length
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Upload Status:', res.statusCode);
    console.log('Upload Headers:', JSON.stringify(res.headers, null, 2));
    try {
      console.log('Upload Body:', JSON.stringify(JSON.parse(d), null, 2));
    } catch (e) {
      console.log('Upload Body (raw):', d);
    }
  });
});

req.on('error', e => console.error('Upload Error:', e));
req.write(fullBody);
req.end();
