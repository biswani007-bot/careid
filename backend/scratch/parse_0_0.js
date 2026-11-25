const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');
console.log('Total file length:', content.length);

const canvasRegex = /<canvas\s+id="([^"]+)"\s+name="([^"]+)"[^>]*>/g;
let match;
while ((match = canvasRegex.exec(content)) !== null) {
  console.log('Canvas:', match[1], '->', match[2]);
}

// Find top-level frames under all canvases
const frameRegex = /<frame\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g;
let frameCount = 0;
const frames = [];
while ((match = frameRegex.exec(content)) !== null) {
  frameCount++;
  if (frames.length < 25) {
    frames.push({ id: match[1], name: match[2], w: match[5], h: match[6] });
  }
}
console.log('Total frames found in document:', frameCount);
console.log('First 25 frames:');
frames.forEach(f => console.log(`  [${f.id}] ${f.name} (${f.w}x${f.h})`));
