const fs = require('fs');

const content = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');

function getFrameXml(nodeId) {
  const startTag = `<frame id="${nodeId}"`;
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) return null;
  
  // Find where this frame ends. It ends when we see </frame> that matches indentation or closing.
  // In the XML, top-level frames under root are indented by 2 spaces: "  <frame id="...
  // The next top-level frame is also "  <frame id=" or "  </page>" / "</document>"
  const nextTopFrame = content.indexOf('\n  <frame id="', startIdx + 10);
  const pageEnd = content.indexOf('\n  </', startIdx + 10);
  let endIdx = content.length;
  if (nextTopFrame !== -1) endIdx = Math.min(endIdx, nextTopFrame);
  if (pageEnd !== -1) endIdx = Math.min(endIdx, pageEnd);

  return content.substring(startIdx, endIdx);
}

const frames = [
  { id: '20:3645', name: 'Admin Portal - OCR Processing Queue' },
  { id: '20:3975', name: 'Admin Portal - OCR Analytics Dashboard' },
  { id: '20:4292', name: 'Admin Portal - OCR Verification Workspace' }
];

for (const f of frames) {
  const xml = getFrameXml(f.id);
  console.log(`Frame ${f.id} (${f.name}): length = ${xml ? xml.length : 'NOT FOUND'}`);
  if (xml) {
    fs.writeFileSync(`scratch/frame_${f.id.replace(':', '_')}.xml`, xml, 'utf8');
    const lines = xml.split('\n');
    console.log(`Saved scratch/frame_${f.id.replace(':', '_')}.xml with ${lines.length} lines`);
  }
}
