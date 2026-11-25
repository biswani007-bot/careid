const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');
const adminIdx = content.indexOf('id="20:55"');
console.log('adminIdx:', adminIdx);
const nextCanvas = content.indexOf('<canvas', adminIdx + 10);
console.log('nextCanvas:', nextCanvas);
const adminSection = content.substring(adminIdx, nextCanvas > 0 ? nextCanvas : adminIdx + 2000000);
console.log('adminSection length:', adminSection.length);

const frameRegex = /<frame\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g;
let m;
const frames = [];
while ((m = frameRegex.exec(adminSection)) !== null) {
  frames.push({ id: m[1], name: m[2], w: parseFloat(m[5]), h: parseFloat(m[6]) });
}
console.log('Frames in 20:55 canvas:', frames.length);

// Top level frames (direct children or screen sized)
const screens = frames.filter(f => (f.w >= 350 && f.h >= 600) || (f.w >= 1000 && f.h >= 500));
console.log('Screen-like frames (mobile or desktop):', screens.length);
screens.forEach(s => console.log(`  [${s.id}] ${s.name} (${s.w}x${s.h})`));

if (screens.length === 0) {
  console.log('Sample frames:');
  frames.slice(0, 30).forEach(s => console.log(`  [${s.id}] ${s.name} (${s.w}x${s.h})`));
}
