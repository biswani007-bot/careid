const fs = require('fs');

const text = fs.readFileSync('C:\\\\Users\\\\biswa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\\\.system_generated\\\\steps\\\\4982\\\\output.txt', 'utf8');

const lines = text.split('\n');
const texts = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // extract text content from <text> tag
  // In figma mcp output.txt, text tags might be <text id="..." name="..." ...> or has inner text or name="something"
  const m = line.match(/<text [^>]*name="([^"]+)"[^>]*>/);
  if (m) {
    texts.push({ line: i + 1, name: m[1] });
  }
}

console.log('Total text tags:', texts.length);
texts.forEach(t => console.log(`L${t.line}: ${t.name}`));
