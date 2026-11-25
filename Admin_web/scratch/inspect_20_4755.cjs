const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4755.xml', 'utf8');

// Print root frame attributes
const rootMatch = xml.match(/<frame[^>]+id="20:4755"[^>]*>/);
console.log('Root frame:', rootMatch ? rootMatch[0] : 'None');

// Print all elements with name, id, x, y, width, height
const elementRegex = /<([a-zA-Z0-9_-]+)\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g;

let match;
const elements = [];
while ((match = elementRegex.exec(xml)) !== null) {
  elements.push({
    tag: match[1],
    id: match[2],
    name: match[3],
    x: parseFloat(match[4]),
    y: parseFloat(match[5]),
    w: parseFloat(match[6]),
    h: parseFloat(match[7]),
  });
}

console.log(`Total elements: ${elements.length}`);
console.log('\nTop-level / major elements (y < 500 or width > 100):');
elements.filter(e => e.w > 80).slice(0, 50).forEach(e => {
  console.log(`${e.id.padEnd(10)} ${e.tag.padEnd(8)} [${e.x}, ${e.y}, ${e.w}x${e.h}] : ${e.name}`);
});
