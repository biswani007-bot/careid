const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

const doctorFolder = postman.item.find(i => i.name.toLowerCase().includes('doctor'));

console.log('Folder Name:', doctorFolder ? doctorFolder.name : 'NOT FOUND');

if (doctorFolder) {
  function dumpFolder(items, indent = '') {
    for (const item of items) {
      if (item.request) {
        console.log(`${indent}* [${item.request.method}] ${item.name}`);
        console.log(`${indent}  URL: ${typeof item.request.url === 'string' ? item.request.url : item.request.url.raw}`);
        if (item.request.url && item.request.url.query) {
          console.log(`${indent}  Query:`, item.request.url.query.map(q => q.key).join(', '));
        }
      }
      if (item.item) {
        console.log(`${indent}> ${item.name}`);
        dumpFolder(item.item, indent + '  ');
      }
    }
  }
  dumpFolder(doctorFolder.item);
}

