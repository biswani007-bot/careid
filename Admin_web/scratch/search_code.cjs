const fs = require('fs');
const path = require('path');

function searchCode(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
      searchCode(full);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.js') || e.name.endsWith('.json'))) {
      const txt = fs.readFileSync(full, 'utf8');
      if (txt.includes('305') || txt.includes('308') || txt.includes('04d8276b-1e4f-4a8e-b53b-f322effd8430')) {
        console.log(`Match in ${full}`);
      }
    }
  }
}

searchCode('./src');

