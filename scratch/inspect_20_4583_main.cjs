const fs = require('fs');

const xml = fs.readFileSync('scratch/frame_20_4583.xml', 'utf8');

console.log('=== MAIN CONTENT OF 20:4583 (0 to 4668) ===');

const lines = xml.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const idMatch = line.match(/id="([^"]+)"/);
  const nameMatch = line.match(/name="([^"]+)"/);
  const wMatch = line.match(/width="([^"]+)"/);
  const hMatch = line.match(/height="([^"]+)"/);
  const xMatch = line.match(/x="([^"]+)"/);
  const yMatch = line.match(/y="([^"]+)"/);
  const tagMatch = line.match(/^<([a-zA-Z0-9_-]+)/);

  if (idMatch && nameMatch && tagMatch) {
    const id = idMatch[1];
    const num = parseInt(id.split(':')[1]);
    if (num < 4668) {
      console.log(`[${id.padEnd(8)}] <${tagMatch[1].padEnd(8)}> ${nameMatch[1].padEnd(50)} (${wMatch ? wMatch[1] : ''}x${hMatch ? hMatch[1] : ''} at ${xMatch ? xMatch[1] : ''},${yMatch ? yMatch[1] : ''})`);
    }
  }
}
