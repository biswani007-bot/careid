const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4755.xml', 'utf8');

// Print all text tags with their content and parent
const textMatches = xml.matchAll(/<text[^>]+id="([^"]+)"[^>]*>([\s\S]*?)<\/text>|<text[^>]+id="([^"]+)"[^>]+name="([^"]+)"/g);
console.log('--- ALL TEXT ELEMENTS ---');
for (const m of textMatches) {
  const id = m[1] || m[3];
  const content = m[2]?.trim() || m[4];
  console.log(`${id.padEnd(10)}: ${content}`);
}
