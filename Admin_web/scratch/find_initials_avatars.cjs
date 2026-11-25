const fs = require('fs');
const path = require('path');

const results = [];

function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      scan(full);
    } else if (item.isFile() && full.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // check for lines that are just 1-2 uppercase letters or span with 1-2 uppercase letters
        if (
          (/^[A-Z]{1,2}$/.test(trimmed) || /^<span[^>]*>[A-Z]{1,2}<\/span>$/.test(trimmed)) &&
          idx > 0 &&
          /avatar|user|header|btn|profile/i.test(lines[idx-1] + lines[idx-2] || '')
        ) {
          results.push({
            file: path.relative('.', full),
            line: idx + 1,
            matched: trimmed,
            context: lines[idx-1].trim()
          });
        }
      });
    }
  }
}

scan('src/components');
console.log(`Found ${results.length} initial avatars:`);
results.forEach(r => console.log(`${r.file}:${r.line} -> "${r.matched}" (context: ${r.context})`));

