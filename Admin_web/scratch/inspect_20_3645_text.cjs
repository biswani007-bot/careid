const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_3645.xml', 'utf8');

// Find all text and button labels
const texts = [];
const lines = xml.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<text ') || line.includes('<component ') || line.includes('<instance ')) {
    const nameMatch = line.match(/name="([^"]+)"/);
    const idMatch = line.match(/id="([^"]+)"/);
    if (nameMatch && idMatch) {
      texts.push({ id: idMatch[1], name: nameMatch[1], line: line.trim() });
    }
  }
}

console.log('Total text/component elements in 20:3645:', texts.length);
texts.slice(0, 40).forEach(t => console.log(`[${t.id}] ${t.name}`));
