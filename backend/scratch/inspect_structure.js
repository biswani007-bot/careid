const fs = require('fs');

const bundle = fs.readFileSync('C:\\Users\\PABANI\\careidadmin-bundle.js', 'utf8');

// Find all occurrences of navigation or route links
const linkRegex = /to:\s*["`']([^"`']+)["`']/g;
const links = new Set();
let m;
while ((m = linkRegex.exec(bundle)) !== null) {
  links.add(m[1]);
}
console.log('--- Router Link "to" targets ---');
console.log(Array.from(links).sort());

// Find route paths in Route components: path="...", path:`...`
const routePathRegex = /path:\s*[`"']([^`"']+)`?["']/g;
const routePaths = new Set();
while ((m = routePathRegex.exec(bundle)) !== null) {
  routePaths.add(m[1]);
}
console.log('--- Route Paths ---');
console.log(Array.from(routePaths).sort());

// Search for sidebar menus
const menuRegex = /label:\s*[`"']([^`"']+)`?["'],\s*path:\s*[`"']([^`"']+)`?["']/g;
const menuItems = [];
while ((m = menuRegex.exec(bundle)) !== null) {
  menuItems.push({ label: m[1], path: m[2] });
}
console.log('--- Sidebar Menu Items ({label, path}) ---');
console.log(menuItems);

// Search for translation top-level modules
const transSnippet = bundle.substring(360000, 395000);
fs.writeFileSync('scratch/translations_sample.txt', transSnippet);
console.log('Wrote translation snippet to scratch/translations_sample.txt');

