const https = require('https');
const fs = require('fs');

const TOKEN_CACHE_FILE = 'scratch/cached_token.json';
let token = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf8')).token;

function req(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: '360api.vnvision.in',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    r.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (postData) r.write(postData);
    r.end();
  });
}

async function main() {
  console.log('--- Probing Live Health Records & OCR Endpoints ---');

  const endpoints = [
    '/api/v1/medical-records',
    '/api/v1/medical-records/timeline',
    '/api/v1/medical-records/search?q=a',
    '/api/v1/immunisation/records',
    '/api/v1/ocr/dashboard',
    '/api/v1/ocr/statistics',
    '/api/v1/ocr/jobs',
    '/api/v1/ocr/review',
    '/api/v1/ocr/templates',
    '/api/v1/reports',
    '/api/v1/reports/categories',
  ];

  for (const ep of endpoints) {
    const res = await req(ep);
    console.log(`\n[${res.status}] ${ep}`);
    if (res.data) {
      const summary = typeof res.data === 'object' ? JSON.stringify(res.data).slice(0, 300) : res.data;
      console.log('   Data snippet:', summary);
    } else {
      console.log('   Raw:', res.raw?.slice(0, 150));
    }
  }
}

main();

