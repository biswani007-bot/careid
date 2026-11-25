const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const adminFolder = collection.item.find(i => i.name && i.name.includes('04. Admin Portal'));
if (adminFolder) {
  console.log('Folder 04 items:');
  function printItems(items, depth = 0) {
    for (const item of items) {
      if (item.request) {
        console.log('  '.repeat(depth) + item.request.method + ' ' + (typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw) + ' (' + item.name + ')');
      }
      if (item.item) {
        console.log('  '.repeat(depth) + '[Folder] ' + item.name);
        printItems(item.item, depth + 1);
      }
    }
  }
  printItems(adminFolder.item);
}

