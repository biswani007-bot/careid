const fs = require('fs');

const appContent = fs.readFileSync('src/App.tsx', 'utf8');
const routes = [];
const regex = /<Route\s+path=["']([^"']+)["'](?:\s+element=\{([^}]+)\})?/g;
let m;
while ((m = regex.exec(appContent)) !== null) {
  routes.push({ path: m[1], element: m[2] ? m[2].trim() : '' });
}
console.log('Total routes found:', routes.length);
fs.writeFileSync('scratch/all_routes.json', JSON.stringify(routes, null, 2));

// List distinct elements/pages
const distinctElements = [...new Set(routes.map(r => r.element).filter(e => !e.includes('Navigate')))];
console.log('Distinct Page Components:', distinctElements.length);
distinctElements.forEach(e => console.log(' - ' + e));

