const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('scratch/backend_openapi.json', 'utf8'));

console.log('=== CHECK PATIENTS ENDPOINTS ===');
for (const p of Object.keys(doc.paths || {})) {
  if (p.startsWith('/api/v1/patients')) {
    for (const m of Object.keys(doc.paths[p])) {
      console.log(`${m.toUpperCase().padEnd(6)} ${p} - ${doc.paths[p][m].summary}`);
    }
  }
}

console.log('\n=== CHECK ADMIN USERS ENDPOINTS ===');
for (const p of Object.keys(doc.paths || {})) {
  if (p.startsWith('/api/v1/admin/users')) {
    for (const m of Object.keys(doc.paths[p])) {
      console.log(`${m.toUpperCase().padEnd(6)} ${p} - ${doc.paths[p][m].summary}`);
    }
  }
}
