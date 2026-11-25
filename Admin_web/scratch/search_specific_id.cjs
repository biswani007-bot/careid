const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e';
const files = fs.readdirSync(brainDir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const content = fs.readFileSync(path.join(brainDir, file), 'utf8');
  if (content.includes('04d8276b-1e4f-4a8e-b53b-f322effd8430')) {
    console.log(`Match in ${file}:`);
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('04d8276b-1e4f-4a8e-b53b-f322effd8430')) {
        console.log(`  Line ${idx+1}: ${l}`);
      }
    });
  }
}

