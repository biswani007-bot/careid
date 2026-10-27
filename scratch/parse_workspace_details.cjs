const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4292.xml', 'utf8');

function findMatches(str, re) {
  const matches = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

const names = findMatches(xml, /name="([^"]+)"/g);
console.log('=== OCR VERIFICATION WORKSPACE (20:4292) DETAILS ===');
console.log('Unique names count:', new Set(names).size);
console.log('Sample names:');
console.log([...new Set(names)].slice(0, 50).join('\n'));
