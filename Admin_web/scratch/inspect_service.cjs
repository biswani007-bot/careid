const fs = require('fs');

const content = fs.readFileSync('src/services/healthRecordService.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('export async function') || line.includes('export function use') || line.includes('apiClient.get') || line.includes('fetch(') || line.includes('/api/v1/')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

