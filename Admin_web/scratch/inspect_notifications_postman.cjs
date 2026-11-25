const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function inspectFolder(folderName) {
  const folder = collection.item.find(f => f.name.includes(folderName));
  if (!folder) {
    console.log(`Folder not found: ${folderName}`);
    return;
  }
  console.log(`\n=================== ${folder.name} ===================`);
  function walk(items, depth = 0) {
    for (const item of items) {
      if (item.request) {
        console.log('  '.repeat(depth) + item.request.method + ' ' + (item.request.url.raw || item.request.url) + ' | ' + item.name);
        if (item.request.body && item.request.body.raw) {
          console.log('  '.repeat(depth + 1) + 'Body: ' + item.request.body.raw.replace(/\n\s*/g, ' ').slice(0, 150));
        }
      }
      if (item.item) {
        console.log('  '.repeat(depth) + '[' + item.name + ']');
        walk(item.item, depth + 1);
      }
    }
  }
  walk(folder.item);
}

inspectFolder('14. Notifications');
inspectFolder('25. Support');

