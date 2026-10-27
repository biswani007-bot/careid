const fs = require('fs');

const text = fs.readFileSync('C:\\\\Users\\\\biswa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\\\.system_generated\\\\steps\\\\4982\\\\output.txt', 'utf8');

const lines = text.split('\n');
const items = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<frame ') || line.includes('<text ') || line.includes('<rounded-rectangle ')) {
    const nameMatch = line.match(/name="([^"]+)"/);
    const idMatch = line.match(/id="([^"]+)"/);
    if (nameMatch && idMatch) {
      const name = nameMatch[1];
      const id = idMatch[1];
      if (name !== 'Container' && name !== 'Text' && name !== 'Icon' && name !== 'Background') {
        items.push({ id, name, line: i + 1 });
      }
    }
  }
}

console.log('Items 100 to end:');
items.slice(90).forEach(it => console.log(`${it.id} | ${it.name} (line ${it.line})`));
