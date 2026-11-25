const fs = require('fs');
const path = require('path');

const targetExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css'];
const searchDirs = ['src', 'public'];
const singleFiles = ['index.html'];

const matches = [];

function searchFile(fullPath) {
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (/Health\s*Vault/i.test(line) || /HealthVault/i.test(line)) {
        matches.push({
          file: path.relative(path.resolve('.'), fullPath),
          lineNum: idx + 1,
          line: line.trim()
        });
      }
    });
  } catch (err) {
    // ignore
  }
}

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (targetExts.includes(ext)) {
        searchFile(fullPath);
      }
    }
  }
}

searchDirs.forEach(d => {
  if (fs.existsSync(d)) searchDir(d);
});
singleFiles.forEach(f => {
  if (fs.existsSync(f)) searchFile(f);
});

console.log(`Found ${matches.length} occurrences in src, public, index.html:`);
matches.forEach(m => console.log(`${m.file}:${m.lineNum} -> ${m.line}`));
