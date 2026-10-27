const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\biswa\\.gemini\\antigravity-ide\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\5272\\output.txt', 'utf8');

const regex = /<frame id="([^"]+)" name="([^"]+)"/g;
let match;
const frames = [];

while ((match = regex.exec(text)) !== null) {
  frames.push({ id: match[1], name: match[2] });
}

console.log('Total frames on page 20:55:', frames.length);
const matching = frames.filter(f => f.name.toLowerCase().includes('facility') || f.name.toLowerCase().includes('edit'));
console.log('Matching frames:');
matching.forEach(f => console.log(`ID: ${f.id} | Name: ${f.name}`));
