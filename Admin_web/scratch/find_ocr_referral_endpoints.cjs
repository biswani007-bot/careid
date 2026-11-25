const eps = require('./postman_endpoints_summary.json');

console.log('=== OCR ENDPOINTS ===');
const ocr = eps.filter(e => e.url.includes('/ocr'));
ocr.forEach(e => console.log(`[${e.method}] ${e.url}  | ${e.name}`));

console.log('\n=== REFERRAL ENDPOINTS ===');
const ref = eps.filter(e => e.url.includes('/referral'));
ref.forEach(e => console.log(`[${e.method}] ${e.url}  | ${e.name}`));

