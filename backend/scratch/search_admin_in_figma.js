const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');

const regex = /<(?:frame|symbol|component)\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g;
let match;
const matches = [];

while ((match = regex.exec(content)) !== null) {
  const name = match[2];
  if (/admin|facility|staff|governance|super\s*admin/i.test(name)) {
    matches.push({ id: match[1], name, w: match[5], h: match[6] });
  }
}

console.log('Total matches for admin/facility/staff/governance in Figma dump:', matches.length);
matches.slice(0, 30).forEach(m => console.log(`  [${m.id}] ${m.name} (${m.w}x${m.h})`));
