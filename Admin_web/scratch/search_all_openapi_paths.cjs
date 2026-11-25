const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('scratch/live_openapi.json', 'utf8'));
const paths = Object.keys(openapi.paths);

console.log('--- ALL PATHS MATCHING RECORD/TIMELINE/ATTACHMENT/MEDICAL ---');
paths.forEach(p => {
  const pLower = p.toLowerCase();
  if (pLower.includes('timeline') || pLower.includes('record') || pLower.includes('attachment') || pLower.includes('medical') || pLower.includes('encounter') || pLower.includes('patient')) {
    console.log(p, Object.keys(openapi.paths[p]));
    // Print operationId and summary
    for (const m of Object.keys(openapi.paths[p])) {
      const op = openapi.paths[p][m];
      console.log(`   [${m.toUpperCase()}] ${op.operationId || ''} - ${op.summary || ''}`);
    }
  }
});

