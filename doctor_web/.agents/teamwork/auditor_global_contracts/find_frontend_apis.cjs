const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../../src');

function findApiUsages(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findApiUsages(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Look for api/v1 or apiClient or fetch or axios or endpoints
        if (line.includes('/api/v1') || line.includes('apiClient.') || line.includes('axios.')) {
          results.push({
            file: path.relative(srcDir, fullPath).replace(/\\/g, '/'),
            lineNum: idx + 1,
            line: line.trim()
          });
        }
      });
    }
  }
  return results;
}

const apiUsages = findApiUsages(srcDir);
console.log('Total API call lines in src:', apiUsages.length);

fs.writeFileSync(
  path.resolve(__dirname, 'frontend_api_usages.json'),
  JSON.stringify(apiUsages, null, 2),
  'utf8'
);

let md = '# Frontend API Usages across src/\n\n';
apiUsages.forEach(u => {
  md += `- \`${u.file}:${u.lineNum}\` — \`${u.line}\`\n`;
});
fs.writeFileSync(path.resolve(__dirname, 'frontend_api_usages.md'), md, 'utf8');
console.log('Saved frontend_api_usages.md');
