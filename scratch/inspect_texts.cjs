const fs = require('fs');
const xml = fs.readFileSync('scratch/frame_20_4755.xml', 'utf8');

// Match <text ...>content</text> or <text ... /> with characters or name
const lines = xml.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<text ') || line.includes('</text>')) {
    console.log(`Line ${i}: ${line.trim()}`);
  }
}
