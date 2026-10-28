const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4583.xml', 'utf8');

console.log('=== TEXT STRINGS IN 20:4583 ===');
const lines = xml.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<text ') || line.includes('characters=') || line.includes('Heading') || line.includes('Button')) {
    const id = line.match(/id="([^"]+)"/)?.[1];
    const name = line.match(/name="([^"]+)"/)?.[1];
    const num = id ? parseInt(id.split(':')[1]) : 0;
    if (num < 4668) {
      console.log(`[${id}] ${name} -> ${line.trim()}`);
    }
  }
}
