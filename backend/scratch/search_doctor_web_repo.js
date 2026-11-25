const fs = require('fs');
const path = require('path');

const found = [];

function search(dir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'AppData' || entry.name === '$Recycle.Bin') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (/doctor.*web|doctor.*react|careid.*doc.*web/i.test(entry.name)) {
          found.push({ type: 'directory-match', path: fullPath });
        }
        search(fullPath, maxDepth, currentDepth + 1);
      } else if (entry.isFile()) {
        if (entry.name === 'LoginPage.tsx' || entry.name === 'vite.config.ts') {
          found.push({ type: 'file-match', file: entry.name, path: fullPath });
        }
        if (entry.name === 'package.json') {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (/doctor.*web|careid.*doctor.*web/i.test(content)) {
              found.push({ type: 'package-match', path: fullPath });
            }
          } catch {}
        }
      }
    }
  } catch (err) {}
}

const searchRoots = [
  'C:\\Users\\PABANI\\Downloads',
  'C:\\Users\\PABANI\\Documents',
  'C:\\Users\\PABANI\\Desktop',
  'C:\\Users\\PABANI',
  'C:\\'
];

searchRoots.forEach(root => {
  if (fs.existsSync(root)) {
    console.log(`Searching in root: ${root}...`);
    search(root, 3, 0);
  }
});

console.log('Search completed. Results found:', found.length);
found.forEach(f => console.log('  ', f));
