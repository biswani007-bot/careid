const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
const medFolder = col.item.find(i => i.name.includes('Medical Records'));

function dump(items) {
  for (const it of items) {
    if (it.request) {
      const url = it.request.url?.raw || '';
      console.log(`[${it.request.method}] ${url} | ${it.name}`);
    }
    if (it.item) dump(it.item);
  }
}

if (medFolder) {
  console.log('--- Medical Records Endpoints ---');
  dump(medFolder.item);
} else {
  console.log('Medical Records folder not found');
}

