const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/components');
const map = [];
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('<AdminSidebar')) {
    const afterSidebar = content.slice(content.indexOf('<AdminSidebar'));
    // Look for the first <div className="..." after the closing of sidebar or after sidebar backdrop
    const divMatches = [...afterSidebar.matchAll(/<div\s+(?:[^>]*?\s+)?className=["']([^"']+)["']/g)];
    // Filter out backdrop
    const mainDiv = divMatches.find(m => !m[1].includes('backdrop') && !m[1].includes('sidebar-backdrop'));
    map.push({
      file: path.relative('.', f),
      mainClass: mainDiv ? mainDiv[1] : 'NOT FOUND'
    });
  }
});

console.log(JSON.stringify(map, null, 2));

