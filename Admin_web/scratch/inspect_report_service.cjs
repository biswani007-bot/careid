const fs = require('fs');

const content = fs.readFileSync('src/services/reportService.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('305') || l.includes('medical-records') || l.includes('records')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});

