const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('=== OPENAPI TAGS & ENDPOINTS INVENTORY ===');
const tags = {};
const paths = Object.keys(doc.paths || {});

for (const p of paths) {
  const methods = Object.keys(doc.paths[p]);
  for (const m of methods) {
    const op = doc.paths[p][m];
    const opTags = op.tags || ['default'];
    for (const t of opTags) {
      if (!tags[t]) tags[t] = [];
      tags[t].push({ method: m.toUpperCase(), path: p, summary: op.summary || op.operationId });
    }
  }
}

for (const [tag, endpoints] of Object.entries(tags)) {
  console.log(`\nTAG: [${tag}] (${endpoints.length} endpoints)`);
  for (const ep of endpoints.slice(0, 10)) {
    console.log(`  ${ep.method.padEnd(6)} ${ep.path.padEnd(50)} - ${ep.summary}`);
  }
  if (endpoints.length > 10) {
    console.log(`  ... and ${endpoints.length - 10} more`);
  }
}
