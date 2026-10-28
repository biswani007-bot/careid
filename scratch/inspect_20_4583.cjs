const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4583.xml', 'utf8');

console.log('=== INSPECTING FRAME 20:4583: Admin Portal - Rejected OCR & Review History ===');

const lines = xml.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const tagMatch = line.match(/^<([a-zA-Z0-9_-]+)/);
  const idMatch = line.match(/id="([^"]+)"/);
  const nameMatch = line.match(/name="([^"]+)"/);
  const xMatch = line.match(/x="([^"]+)"/);
  const yMatch = line.match(/y="([^"]+)"/);
  const wMatch = line.match(/width="([^"]+)"/);
  const hMatch = line.match(/height="([^"]+)"/);

  if (tagMatch && idMatch && nameMatch) {
    const tag = tagMatch[1];
    const id = idMatch[1];
    const name = nameMatch[1];
    const x = xMatch ? parseFloat(xMatch[1]).toFixed(1) : '';
    const y = yMatch ? parseFloat(yMatch[1]).toFixed(1) : '';
    const w = wMatch ? parseFloat(wMatch[1]).toFixed(1) : '';
    const h = hMatch ? parseFloat(hMatch[1]).toFixed(1) : '';

    if (!name.startsWith('Vector') && !name.startsWith('Group') && !name.includes(':margin')) {
      const indent = ' '.repeat(Math.max(0, (line.length - line.trimStart().length)));
      console.log(`[${id.padEnd(8)}] <${tag.padEnd(7)}> ${name.padEnd(50)} (${w}x${h} at ${x},${y})`);
    }
  }
}
