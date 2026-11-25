const fs = require('fs');
const path = require('path');

const colPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const col = JSON.parse(fs.readFileSync(colPath, 'utf8'));

const results = [];

function walk(items, folder = '') {
  for (const item of items) {
    if (item.item) {
      walk(item.item, folder ? `${folder} > ${item.name}` : item.name);
    } else if (item.request) {
      results.push({
        folder,
        name: item.name,
        method: item.request.method,
        url: item.request.url.raw || ''
      });
    }
  }
}

walk(col.item);

const relevant = results.filter(r => {
  const f = r.folder.toLowerCase();
  const u = r.url.toLowerCase();
  const n = r.name.toLowerCase();
  return f.includes('appoint') || f.includes('financ') || f.includes('encounter') || 
         u.includes('appoint') || u.includes('slot') || u.includes('sched') ||
         u.includes('clear') || u.includes('readiness') || u.includes('checkin') ||
         u.includes('check-in') || u.includes('hold') || u.includes('offer');
});

console.log(`Found ${relevant.length} relevant endpoints:`);
for (const r of relevant) {
  console.log(`[${r.method}] ${r.url} | ${r.folder} | ${r.name}`);
}
