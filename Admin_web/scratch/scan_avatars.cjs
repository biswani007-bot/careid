const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res.push(...walk(p));
    else if (f.endsWith('.tsx') && (f.startsWith('Admin') || f.includes('Header') || f.includes('Sidebar') || f.includes('Layout'))) res.push(p);
  }
  return res;
}

const files = walk('src');
console.log('Total relevant files:', files.length);

const results = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const hits = [];
  if (content.includes('header-avatar') || content.includes('avatar-admin') || content.includes('headerAvatarImg')) hits.push('uses header avatar img');
  if (content.includes('rostovaAvatar')) hits.push('rostovaAvatar');
  if (/(\bAD\b|\bSA\b|\bEV\b|\bER\b|\bSC\b|\bRC\b|\bA\b)/.test(content) && content.toLowerCase().includes('avatar')) hits.push('avatar initials');
  if (content.includes('/admin/profile')) hits.push('references /admin/profile');
  if (hits.length > 0) {
    results.push({ file: f.replace(/\\/g, '/'), hits });
  }
}
console.log(JSON.stringify(results, null, 2));

