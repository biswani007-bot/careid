const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

// Match paths like "/admin/...", "/login", etc.
const pathRegex = /["'](\/(?:admin|login|dashboard|patients|doctors|facilities|departments|records|ocr|referrals|audit|security|settings)[a-zA-Z0-9_/-]*)["']/g;
let m;
const paths = new Set();
while ((m = pathRegex.exec(bundle)) !== null) {
  paths.add(m[1]);
}

console.log('--- Paths matched (' + paths.size + ') ---');
console.log(Array.from(paths).sort());

// Search for sidebar menu items
const sidebarRegex = /name:\s*["']([^"']+)["'],\s*href:\s*["']([^"']+)["']/g;
const navs = [];
while ((m = sidebarRegex.exec(bundle)) !== null) {
  navs.push({ name: m[1], href: m[2] });
}
console.log('--- Sidebar / Navigation objects ---');
console.log(navs);

// Search for token storage or auth state
const tokenRegex = /["'](careid[a-zA-Z0-9_]*|auth[a-zA-Z0-9_]*|token[a-zA-Z0-9_]*|admin[a-zA-Z0-9_]*)["']/gi;
const tokens = new Set();
while ((m = tokenRegex.exec(bundle)) !== null) {
  if (m[1].length > 4 && m[1].length < 30) tokens.add(m[1]);
}
console.log('--- Token / Auth storage keys candidates ---');
console.log(Array.from(tokens).slice(0, 40));

