const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
const docFolder = col.item.find(i => i.name.includes('Doctor Portal'));

function dump(items) {
  for (const it of items) {
    if (it.request) {
      const url = it.request.url?.raw || '';
      console.log(`[${it.request.method}] ${url} | ${it.name}`);
    }
    if (it.item) dump(it.item);
  }
}

if (docFolder) {
  console.log('--- Doctor Portal Endpoints ---');
  dump(docFolder.item);
} else {
  console.log('Doctor Portal folder not found');
}

