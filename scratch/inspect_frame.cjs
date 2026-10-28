const fs = require('fs');
const xml = fs.readFileSync('scratch/frame_20_4755.xml', 'utf8');

const regex = /<([a-zA-Z0-9]+)\s+id="([^"]+)"\s+name="([^"]+)"([^>]*)>/g;
let match;
while ((match = regex.exec(xml)) !== null) {
  const [_, tag, id, name, rest] = match;
  console.log(`${tag} [${id}]: ${name} ${rest.trim()}`);
}
