const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');

// Split by canvas
const canvases = content.split('<canvas ');
canvases.slice(1).forEach(c => {
  const nameMatch = c.match(/id="([^"]+)"\s+name="([^"]+)"/);
  if (!nameMatch) return;
  const id = nameMatch[1];
  const name = nameMatch[2];
  
  // Find direct top-level frames or symbols
  // A direct child of canvas will have indentation or appear before closing </canvas>
  const frames = [];
  const lines = c.split('\n');
  for (const line of lines) {
    // Look for lines that start with 2 spaces and <frame or <symbol
    const m = line.match(/^\s{2}<(frame|symbol|component)\s+id="([^"]+)"\s+name="([^"]+)"\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/);
    if (m) {
      frames.push({ type: m[1], id: m[2], name: m[3], w: m[6], h: m[7] });
    }
  }
  console.log(`Canvas [${id}] "${name}": found ${frames.length} top-level items`);
  frames.slice(0, 10).forEach(f => console.log(`   [${f.id}] ${f.name} (${f.w}x${f.h})`));
});
