const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function printFolder(folderName) {
  const folder = collection.item.find(f => f.name.includes(folderName));
  if (!folder) return;
  console.log(`\n=================== ${folder.name} ===================`);
  function walk(items, depth = 0) {
    for (const item of items) {
      if (item.request) {
        console.log(
          '  '.repeat(depth) + item.request.method + ' ' + (item.request.url.raw || item.request.url) + ' | ' + item.name
        );
      }
      if (item.item) {
        console.log('  '.repeat(depth) + '[' + item.name + ']');
        walk(item.item, depth + 1);
      }
    }
  }
  walk(folder.item);
}

printFolder('04. Admin Portal');
printFolder('06. Patient App');
printFolder('15. OCR & Document Verification');

