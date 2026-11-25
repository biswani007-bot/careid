const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findFolder15(items) {
  for (const it of items) {
    if (it.name && it.name.includes('OCR')) {
      return it;
    }
    if (it.item) {
      const found = findFolder15(it.item);
      if (found) return found;
    }
  }
}

const f15 = findFolder15(col.item);
console.log('Folder name:', f15.name);

function printRequests(folder, depth = 0) {
  if (folder.item) {
    for (const it of folder.item) {
      if (it.request) {
        console.log(`[${it.request.method}] ${it.name}`);
        console.log(`  URL: ${it.request.url?.raw || it.request.url}`);
        if (it.request.url?.query) {
          console.log(`  Query params:`, it.request.url.query.map(q => q.key + (q.value ? '=' + q.value : '')).join(', '));
        }
      }
      if (it.item) {
        printRequests(it, depth + 1);
      }
    }
  }
}

printRequests(f15);

