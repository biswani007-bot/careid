const fs = require('fs');

const content = fs.readFileSync('src/services/healthRecordService.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('useHealthRecordsQuery')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});

