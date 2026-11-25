const fs = require('fs');
const path = require('path');

const collectionPath = path.resolve('Postman collection', 'CareID-Staging.postman_collection.json');
const raw = fs.readFileSync(collectionPath, 'utf8');
const data = JSON.parse(raw);

console.log('Collection Info:', data.info);

function traverse(items, currentPath = []) {
  let results = [];
  for (const item of items) {
    const newPath = [...currentPath, item.name];
    if (item.item && Array.isArray(item.item)) {
      results.push({ type: 'folder', path: newPath.join(' > '), count: item.item.length });
      results = results.concat(traverse(item.item, newPath));
    } else if (item.request) {
      const req = item.request;
      const method = req.method;
      const url = req.url ? (typeof req.url === 'string' ? req.url : (req.url.raw || '')) : '';
      results.push({
        type: 'request',
        folder: currentPath.join(' > '),
        name: item.name,
        method,
        url
      });
    }
  }
  return results;
}

const all = traverse(data.item);
const folders = all.filter(x => x.type === 'folder');
const requests = all.filter(x => x.type === 'request');

console.log(`Total folders: ${folders.length}`);
console.log(`Total requests: ${requests.length}`);

// Print top level folders
for (const item of data.item) {
  console.log(`Top-level: [${item.name}] (${item.item ? item.item.length + ' items' : 'request'})`);
}
