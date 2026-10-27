const fs = require('fs');
const content = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');

const regex = /<frame\s+id="([^"]+)"\s+name="([^"]*OCR[^"]*)"\s+x="([^"]*)"\s+y="([^"]*)"\s+width="([^"]*)"\s+height="([^"]*)"/gi;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log(`ID: ${m[1].padEnd(10)} | Name: ${m[2].padEnd(50)} | (${m[3]}, ${m[4]}) ${m[5]}x${m[6]}`);
}
