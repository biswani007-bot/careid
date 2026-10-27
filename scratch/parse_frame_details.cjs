const fs = require('fs');

function inspectFrame(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n======================================================`);
  console.log(`Inspecting ${filePath}`);
  console.log(`======================================================`);

  // Extract all frames and text elements
  const lines = content.split('\n');
  const elements = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('<frame') || trimmed.startsWith('<text') || trimmed.startsWith('<component') || trimmed.startsWith('<instance')) {
      const idMatch = trimmed.match(/id="([^"]+)"/);
      const nameMatch = trimmed.match(/name="([^"]+)"/);
      const xMatch = trimmed.match(/x="([^"]+)"/);
      const yMatch = trimmed.match(/y="([^"]+)"/);
      const wMatch = trimmed.match(/width="([^"]+)"/);
      const hMatch = trimmed.match(/height="([^"]+)"/);
      const tag = trimmed.match(/^<([a-zA-Z0-9_-]+)/)?.[1];
      if (idMatch && nameMatch) {
        elements.push({
          tag,
          id: idMatch[1],
          name: nameMatch[1],
          x: xMatch ? xMatch[1] : '',
          y: yMatch ? yMatch[1] : '',
          w: wMatch ? wMatch[1] : '',
          h: hMatch ? hMatch[1] : '',
        });
      }
    }
  }
  console.log(`Found ${elements.length} structured elements.`);
  return elements;
}

const qElements = inspectFrame('scratch/frame_20_3645.xml');
fs.writeFileSync('scratch/elements_20_3645.json', JSON.stringify(qElements, null, 2));

const aElements = inspectFrame('scratch/frame_20_3975.xml');
fs.writeFileSync('scratch/elements_20_3975.json', JSON.stringify(aElements, null, 2));

const wElements = inspectFrame('scratch/frame_20_4292.xml');
fs.writeFileSync('scratch/elements_20_4292.json', JSON.stringify(wElements, null, 2));
