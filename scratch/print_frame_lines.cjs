const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4755.xml', 'utf8');

const lines = xml.split('\n');
console.log(`Total lines: ${lines.length}`);

lines.slice(150, 300).forEach((l, idx) => {
  console.log(`${(idx + 151).toString().padStart(3)}: ${l}`);
});
