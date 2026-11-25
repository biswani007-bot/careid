const fs = require('fs');

const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/steps/30208/output.txt', 'utf8');

const canvases = content.split('<canvas ');
canvases.slice(1).forEach((c, idx) => {
  const nameMatch = c.match(/id="([^"]+)"\s+name="([^"]+)"/);
  if (!nameMatch) return;
  const id = nameMatch[1];
  const name = nameMatch[2];
  
  const lines = c.split('\n');
  console.log(`\n=== Canvas [${id}] "${name}" (total lines: ${lines.length}) ===`);
  console.log('First 5 lines:');
  lines.slice(0, 5).forEach((l, i) => console.log(`  ${i}: ${l.substring(0, 100)}`));
});
