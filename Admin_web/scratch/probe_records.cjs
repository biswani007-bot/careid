const fs = require('fs');
const path = require('path');

function searchFiles(dir, filter) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      results.push(...searchFiles(fullPath, filter));
    } else if (entry.isFile() && filter(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const recordFiles = searchFiles('./src', name => name.toLowerCase().includes('record'));
console.log('Record files in src:', recordFiles);

