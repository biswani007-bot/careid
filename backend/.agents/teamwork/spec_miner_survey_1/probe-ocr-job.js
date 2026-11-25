const https = require('https');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYTUwMmYyZS0zMzJjLTRlYzAtYjZhYS04MzcxMzIxNmVjODgiLCJwaG9uZSI6IisxNjUwNTU1MDAwMyIsInNlc3Npb25JZCI6IjFmMGE2NjIyLWVjNjAtNDM2MS04YTgzLTgwNzMwOWFiYzUyNyIsInJvbGVzIjpbIkRPQ1RPUiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkOnByb2ZpbGUiLCJyZWFkOnJlcG9ydHMiLCJ3cml0ZTpyZXBvcnRzIiwicmVhZDpoZWFsdGgtY2FyZCIsInZlcmlmeTpoZWFsdGgtY2FyZCJdLCJpYXQiOjE3OTQyMjcyMDUsImV4cCI6MTc5NDIyODEwNX0.p1igKws9nqasPHFETi8Y68NwTz2WUvC_zDqsmyMV_0g';
const attachmentId = '0b3288c1-dc8e-4e3c-85de-39a5066aabc7';

const payload = JSON.stringify({
  medicalAttachmentId: attachmentId,
  documentType: 'LAB_REPORT'
});

const req = https.request('https://360api.vnvision.in/api/v1/ocr/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('OCR Job Status:', res.statusCode);
    console.log('OCR Job Headers:', JSON.stringify(res.headers, null, 2));
    try {
      console.log('OCR Job Body:', JSON.stringify(JSON.parse(d), null, 2));
    } catch (e) {
      console.log('OCR Job Body (raw):', d);
    }
  });
});

req.on('error', e => console.error('OCR Job Error:', e));
req.write(payload);
req.end();
