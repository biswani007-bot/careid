const fs = require('fs');
const content = fs.readFileSync('src/modules/security/presentation/dto/security-response.dto.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('SecurityAuditLogResponseDto'));
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 40).join('\n'));
} else {
  console.log('Not found');
}

