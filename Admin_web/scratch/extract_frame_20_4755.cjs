const fs = require('fs');

const xml = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');
const targetId = '20:4755';
const needle = `id="${targetId}"`;

const idx = xml.indexOf(needle);
console.log(`Found ${needle} at index:`, idx);

if (idx !== -1) {
  // Find start of tag
  const startTagIdx = xml.lastIndexOf('<frame', idx);
  // Find matching closing frame
  let depth = 0;
  let pos = startTagIdx;
  let endTagIdx = -1;

  while (pos < xml.length) {
    const nextOpen = xml.indexOf('<frame', pos);
    const nextSelfClose = xml.indexOf('/>', pos);
    const nextClose = xml.indexOf('</frame>', pos);

    // Let's find whichever comes next
    const candidates = [];
    if (nextOpen !== -1) candidates.push({ type: 'open', pos: nextOpen });
    if (nextClose !== -1) candidates.push({ type: 'close', pos: nextClose });

    candidates.sort((a, b) => a.pos - b.pos);
    if (candidates.length === 0) break;

    const next = candidates[0];
    if (next.type === 'open') {
      // Check if it's self-closing
      const endOfThisTag = xml.indexOf('>', next.pos);
      if (xml[endOfThisTag - 1] === '/') {
        // self closing frame
        pos = endOfThisTag + 1;
      } else {
        depth++;
        pos = endOfThisTag + 1;
      }
    } else if (next.type === 'close') {
      depth--;
      pos = next.pos + 8;
      if (depth === 0) {
        endTagIdx = pos;
        break;
      }
    }
  }

  console.log(`Frame span: ${startTagIdx} to ${endTagIdx} (length: ${endTagIdx - startTagIdx})`);
  const frameXml = xml.substring(startTagIdx, endTagIdx);
  fs.writeFileSync('scratch/frame_20_4755.xml', frameXml);
  console.log('Saved scratch/frame_20_4755.xml');
} else {
  console.log('Target frame not found in XML.');
}
