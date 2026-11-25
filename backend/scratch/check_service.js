const fs = require('fs');
const content = fs.readFileSync('src/modules/security/application/use-cases/security.service.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('async getAuditLogs('));
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 55).join('\n'));
} else {
  console.log('Not found');
}

