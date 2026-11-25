const fs = require('fs');
const content = fs.readFileSync('src/services/ocrService.ts', 'utf8');

const regex = /status:\s*'Rejected'/g;
let m;
while ((m = regex.exec(content)) !== null) {
  const start = Math.max(0, content.lastIndexOf('{', m.index));
  const end = content.indexOf('},', m.index);
  console.log('=== Rejected Item Found ===');
  console.log(content.slice(start, end + 1));
}
