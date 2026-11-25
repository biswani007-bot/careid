const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.controller.ts')) {
      results.push(file);
    }
  });
  return results;
}

const controllers = getFiles('src');
console.log(`Found ${controllers.length} controllers in src:`);
controllers.forEach(c => console.log(' - ' + path.relative('src', c)));

