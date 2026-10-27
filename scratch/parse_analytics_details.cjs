const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_3975.xml', 'utf8');

function findMatches(str, re) {
  const matches = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

const names = findMatches(xml, /name="([^"]+)"/g);
console.log('=== OCR ANALYTICS DASHBOARD (20:3975) DETAILS ===');
console.log('Unique names count:', new Set(names).size);
console.log('Sample names:');
console.log([...new Set(names)].slice(0, 50).join('\n'));
