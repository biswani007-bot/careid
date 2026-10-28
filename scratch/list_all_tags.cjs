const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

const tagsSummary = [];
const tagMap = {};

for (const p of Object.keys(doc.paths || {})) {
  for (const m of Object.keys(doc.paths[p])) {
    const op = doc.paths[p][m];
    const opTags = op.tags || ['default'];
    for (const t of opTags) {
      if (!tagMap[t]) tagMap[t] = 0;
      tagMap[t]++;
    }
  }
}

for (const [t, count] of Object.entries(tagMap)) {
  tagsSummary.push({ tag: t, count });
}

tagsSummary.sort((a, b) => b.count - a.count);

console.log('ALL TAGS IN HVAPI ENTERPRISE API:');
tagsSummary.forEach(ts => console.log(`${ts.tag.padEnd(35)} : ${ts.count} endpoints`));
