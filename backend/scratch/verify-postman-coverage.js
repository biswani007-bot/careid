const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('CareID-Staging.postman_collection.json', 'utf8'));

const requiredKeywords = [
  'dispatch',
  'clinical-review',
  'attest',
  'financing',
  'approve-discount',
  'treatment-terms',
  'clearance',
  'rooms',
  'schedules',
  'generate-slots',
  'appointments',
  'holds',
  'resend'
];

const found = {};
requiredKeywords.forEach(k => found[k] = []);

function inspectItems(items) {
  for (const item of items) {
    if (item.request && item.request.url) {
      const urlRaw = typeof item.request.url === 'string' ? item.request.url : item.request.url.raw;
      const method = item.request.method;
      for (const kw of requiredKeywords) {
        if (urlRaw.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw)) {
          found[kw].push({ name: item.name, method, url: urlRaw });
        }
      }
    }
    if (item.item) inspectItems(item.item);
  }
}

inspectItems(collection.item);

console.log('=== POSTMAN VERIFICATION RESULTS ===');
for (const [kw, matches] of Object.entries(found)) {
  console.log(`Keyword: "${kw}" -> ${matches.length} matches`);
  if (matches.length > 0) {
    console.log(`   Sample: [${matches[0].method}] ${matches[0].name} (${matches[0].url})`);
  } else {
    console.warn(`   WARNING: Missing keyword "${kw}"`);
  }
}

