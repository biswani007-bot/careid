const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
const f20 = col.item.find(i => i.name.includes('Clinical Reports & Analytics'));

function dump(items) {
  for (const it of items) {
    if (it.request) {
      const url = it.request.url?.raw || '';
      console.log(`\nEndpoint: [${it.request.method}] ${url}`);
      console.log(`Name: ${it.name}`);
      if (it.request.body?.raw) {
        console.log(`Body: ${it.request.body.raw.slice(0, 200)}`);
      }
    }
    if (it.item) dump(it.item);
  }
}

if (f20) {
  dump(f20.item);
} else {
  console.log('Folder 20 not found');
}

