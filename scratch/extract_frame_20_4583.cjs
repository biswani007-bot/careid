const fs = require('fs');

const content = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');

function getFrameXml(nodeId) {
  const startTag = `<frame id="${nodeId}"`;
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) return null;
  
  const nextTopFrame = content.indexOf('\n  <frame id="', startIdx + 10);
  const pageEnd = content.indexOf('\n  </', startIdx + 10);
  let endIdx = content.length;
  if (nextTopFrame !== -1) endIdx = Math.min(endIdx, nextTopFrame);
  if (pageEnd !== -1) endIdx = Math.min(endIdx, pageEnd);

  return content.substring(startIdx, endIdx);
}

const xml = getFrameXml('20:4583');
console.log('Frame 20:4583 length:', xml ? xml.length : 'NOT FOUND');
if (xml) {
  fs.writeFileSync('scratch/frame_20_4583.xml', xml, 'utf8');
  const lines = xml.split('\n');
  console.log(`Saved scratch/frame_20_4583.xml with ${lines.length} lines`);
}
