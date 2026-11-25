const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('=== SEARCH FOR EMAIL / PASSWORD / LOGIN ===');
const matches = [];
for (const [p, ops] of Object.entries(doc.paths || {})) {
  for (const [m, op] of Object.entries(ops)) {
    const s = JSON.stringify(op).toLowerCase();
    if (s.includes('password') || s.includes('login') || (s.includes('email') && s.includes('auth'))) {
      matches.push({ method: m.toUpperCase(), path: p, summary: op.summary });
    }
  }
}
console.log(`Found ${matches.length} matching endpoints:`);
matches.forEach(m => console.log(`${m.method.padEnd(6)} ${m.path.padEnd(45)} - ${m.summary}`));
