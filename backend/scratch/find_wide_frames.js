const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');

// Search for any frames with width >= 768
const frameRegex = /<frame\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g;
let match;
const wideFrames = [];

while ((match = frameRegex.exec(content)) !== null) {
  const w = parseFloat(match[5]);
  const h = parseFloat(match[6]);
  if (w >= 768) {
    wideFrames.push({ id: match[1], name: match[2], w, h, x: match[3], y: match[4] });
  }
}

console.log('Total frames with width >= 768px:', wideFrames.length);
wideFrames.slice(0, 30).forEach(f => console.log(`  [${f.id}] ${f.name} (${f.w}x${f.h}) at (${f.x}, ${f.y})`));
