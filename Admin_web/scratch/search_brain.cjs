const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const files = fs.readdirSync(brainDir).filter(f => f.endsWith('.md'));

console.log('Brain markdown files:', files.length);
for (const file of files) {
  const content = fs.readFileSync(path.join(brainDir, file), 'utf8');
  if (content.includes('04d8276b-1e4f-4a8e-b53b-f322effd8430') || content.includes('308') || content.includes('305') || content.includes('records')) {
    console.log(`Found mention in ${file}`);
  }
}

