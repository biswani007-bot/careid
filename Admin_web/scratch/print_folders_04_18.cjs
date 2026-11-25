const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, '../Postman collection/CareID-Staging.postman_collection.json');
const col = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function printFolder(folderName) {
  const f = col.item.find(x => x.name.startsWith(folderName));
  if (!f) return;
  console.log(`\n=================== ${f.name} ===================`);
  f.item.forEach((item, idx) => {
    const url = typeof item.request?.url === 'string' ? item.request.url : item.request?.url?.raw || '';
    const body = item.request?.body?.raw || '';
    console.log(`\n[${idx + 1}] ${item.request?.method} ${url}`);
    console.log(`    Name: ${item.name}`);
    if (body) {
      const b = body.replace(/\s+/g, ' ').slice(0, 150);
      console.log(`    Body: ${b}`);
    }
  });
}

printFolder('04. Admin Portal');
printFolder('18. Security');

