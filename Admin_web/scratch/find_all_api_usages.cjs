const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(getAllFiles(full, exts));
    } else if (exts.includes(path.extname(full))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = getAllFiles('src');
const apiOccurrences = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    const match = line.match(/['"`](\/api\/v1\/[^'"`\s?#]+)/);
    if (match) {
      apiOccurrences.push({
        file: file.replace(/\\/g, '/'),
        line: lineNum + 1,
        endpoint: match[1],
        fullLine: line.trim()
      });
    }
  });
}

fs.writeFileSync('scratch/all_api_occurrences.json', JSON.stringify(apiOccurrences, null, 2));

const uniqueEndpoints = [...new Set(apiOccurrences.map(a => a.endpoint))].sort();
console.log('Total API occurrences in src:', apiOccurrences.length);
console.log('Unique endpoints in src:', uniqueEndpoints.length);
uniqueEndpoints.forEach(e => console.log('  ' + e));

