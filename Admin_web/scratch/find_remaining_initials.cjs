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
console.log('Checking ' + files.length + ' admin components...');

const suspectInitials = ['ER', 'AD', 'SA', 'EV', 'SC', 'RC'];
const found = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Check if line looks like an admin header avatar initial
    for (const init of suspectInitials) {
      const regex = new RegExp(`>\\s*${init}\\s*<`);
      if (regex.test(l) && (l.includes('avatar') || lines.slice(Math.max(0, idx-5), idx+5).some(sl => sl.includes('header') || sl.includes('/admin/profile') || sl.includes('topbar')))) {
        found.push({ file: f, line: idx + 1, text: l.trim(), initial: init });
      }
    }
  });
}

console.log('Remaining admin avatar initials:', found);

