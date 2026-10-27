const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_3645.xml', 'utf8');

// Parse all elements in queue
console.log('=== OCR PROCESSING QUEUE (20:3645) DETAILS ===');

// Header
const headerMatch = xml.match(/<frame id="20:3648"[\s\S]*?<\/frame>/);
console.log('Header region found:', !!headerMatch);

// Summary Cards
const cardsMatch = xml.match(/<frame id="20:3664"[\s\S]*?<\/frame>/);

// Filter bar
const filtersMatch = xml.match(/<frame id="20:3705"[\s\S]*?<\/frame>/);

// Data Table
const tableMatch = xml.match(/<frame id="20:3730"[\s\S]*?<\/frame>/);

function findMatches(str, re) {
  const matches = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

const names = findMatches(xml, /name="([^"]+)"/g);
console.log('Unique names count:', new Set(names).size);
console.log('Sample names:');
console.log([...new Set(names)].slice(0, 50).join('\n'));
