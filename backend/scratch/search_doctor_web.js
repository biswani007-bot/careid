const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f';
const files = fs.readdirSync(brainDir).filter(f => f.endsWith('.md'));

console.log('Searching for "doctor web" or "Doctor Web" or "Doctor Portal" in brain artifacts:');
for (const f of files) {
  const content = fs.readFileSync(path.join(brainDir, f), 'utf8');
  const matches = content.match(/doctor\s+(?:web|portal)/gi);
  if (matches) {
    console.log(` - ${f}: ${matches.length} occurrences`);
  }
}
