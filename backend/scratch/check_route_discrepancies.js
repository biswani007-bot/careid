const fs = require('fs');

const endpoints = JSON.parse(fs.readFileSync('scratch/ast_verified_endpoints.json', 'utf8'));

const checks = [
  { name: 'Doctor verification list', targets: ['/api/v1/doctors/verification/pending', '/api/v1/admin/doctors/verification/pending'] },
  { name: 'Doctor approval', targets: ['/api/v1/admin/doctors/:id', '/api/v1/admin/doctors/:id/verify', '/api/v1/doctors/:id/verify'] },
  { name: 'OCR retry', targets: ['/api/v1/ocr/reprocess/:id', '/api/v1/ocr/jobs/:id/retry', '/api/v1/ocr/jobs/:id/reprocess'] },
  { name: 'Audit explorer', targets: ['/api/v1/admin/audit-logs', '/api/v1/governance/audit-logs', '/api/v1/security/audit'] },
  { name: 'Facility departments', targets: ['/api/v1/facilities/:id', '/api/v1/facilities/:id/departments'] }
];

console.log('--- Checking Route Alternatives in Controller AST ---');

checks.forEach(c => {
  console.log(`\nCase: ${c.name}`);
  c.targets.forEach(t => {
    // Normalise path matching
    const norm = t.replace(/:[a-zA-Z0-9_]+/g, ':param');
    const matches = endpoints.filter(e => {
      const eNorm = e.fullPath.replace(/:[a-zA-Z0-9_]+/g, ':param');
      return eNorm === norm || e.fullPath === t;
    });
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  [EXISTS] ${m.httpMethod} ${m.fullPath} -> ${m.controller}.${m.handler} (${m.file})`);
      });
    } else {
      console.log(`  [NOT FOUND] ${t}`);
    }
  });
});
