const fs = require('fs');
const path = require('path');

const endpoints = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'all_endpoints_detail.json'), 'utf8'));

const surgicalKeywords = [
  'surgery', 'surgical', 'operating', 'theater', 'theatre', 'cath',
  'room', 'slot', 'shift', 'encounter', 'procedure', 'clearance',
  'checklist', 'timeout', 'time-out', 'check-in', 'checkin', 'hold', 'readiness'
];

const results = [];
for (const ep of endpoints) {
  const text = `${ep.folder} ${ep.name} ${ep.url}`.toLowerCase();
  for (const kw of surgicalKeywords) {
    if (text.includes(kw)) {
      results.push({ kw, method: ep.method, url: ep.url, name: ep.name, folder: ep.folder });
      break;
    }
  }
}

console.log('Results count:', results.length);
results.forEach(r => console.log(`[${r.method}] ${r.url} | ${r.name} | kw: ${r.kw} | Folder: ${r.folder}`));
