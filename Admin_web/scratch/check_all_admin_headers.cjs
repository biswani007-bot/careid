const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res.push(...walk(p));
    else if (f.endsWith('.tsx') && f.startsWith('Admin')) res.push(p);
  }
  return res;
}

const files = walk('src/components');
console.log('Total Admin components:', files.length);

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  let headerMatch = [];
  lines.forEach((l, idx) => {
    if (l.includes('/admin/profile') || l.includes('header-avatar') || (l.includes('avatar') && (l.includes('button') || l.includes('btn') || l.includes('onClick')))) {
      headerMatch.push(`L${idx+1}: ${l.trim()}`);
    }
  });
  if (headerMatch.length > 0) {
    console.log(`\n=== ${f.replace(/\\/g, '/')} ===`);
    headerMatch.forEach(m => console.log('  ' + m));
  } else {
    console.log(`\nNO AVATAR FOUND: ${f.replace(/\\/g, '/')}`);
  }
}

