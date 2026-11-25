const fs = require('fs');

const xml = fs.readFileSync('scratch/admin_page_metadata.xml', 'utf8');

const regex = /<frame[^>]+id="([^"]+)"[^>]+name="([^"]*referral[^"]*)"/gi;
let m;
while ((m = regex.exec(xml)) !== null) {
  console.log(`${m[1].padEnd(12)}: ${m[2]}`);
}
