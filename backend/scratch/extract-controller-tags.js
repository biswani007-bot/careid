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

const files = getFiles('src');
console.log('Total controllers found:', files.length);

const tags = new Set();
const controllerInfo = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const tagMatch = content.match(/@ApiTags\(['"`](.*?)['"`]\)/);
  const controllerMatch = content.match(/@Controller\(['"`]?(.*?)['"`]?\)/);
  const tag = tagMatch ? tagMatch[1] : 'NONE';
  const prefix = controllerMatch ? controllerMatch[1] : '';
  tags.add(tag);
  controllerInfo.push({
    file: path.relative('src', f).replace(/\\/g, '/'),
    tag,
    prefix
  });
});

console.log('\nAll ApiTags:');
console.log(Array.from(tags).sort());

console.log('\nControllers detail:');
console.table(controllerInfo);

