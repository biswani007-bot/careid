const fs = require('fs');

function inspectTags(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  console.log(`\n======================================================`);
  console.log(`ALL NAMED NODES IN ${xmlPath}`);
  console.log(`======================================================`);

  const lines = xml.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const tagMatch = trimmed.match(/^<([a-zA-Z0-9_-]+)/);
    const idMatch = trimmed.match(/id="([^"]+)"/);
    const nameMatch = trimmed.match(/name="([^"]+)"/);
    const wMatch = trimmed.match(/width="([^"]+)"/);
    const hMatch = trimmed.match(/height="([^"]+)"/);
    if (tagMatch && idMatch && nameMatch) {
      const tag = tagMatch[1];
      const id = idMatch[1];
      const name = nameMatch[1];
      const w = wMatch ? parseFloat(wMatch[1]).toFixed(1) : '';
      const h = hMatch ? parseFloat(hMatch[1]).toFixed(1) : '';
      if (!name.startsWith('Vector') && !name.startsWith('Group') && !name.includes(':margin')) {
        console.log(`[${id.padEnd(8)}] <${tag.padEnd(8)}> ${name.padEnd(45)} (${w}x${h})`);
      }
    }
  }
}

inspectTags('scratch/frame_20_3645.xml');
inspectTags('scratch/frame_20_3975.xml');
inspectTags('scratch/frame_20_4292.xml');
