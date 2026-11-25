const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findEndpoints(items, path = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.request) {
      const url = item.request.url?.raw || (Array.isArray(item.request.url?.path) ? item.request.url.path.join('/') : '');
      const method = item.request.method;
      if (url && (url.toLowerCase().includes('medical-record') || url.toLowerCase().includes('vital') || url.toLowerCase().includes('record'))) {
        results.push({ folder: currentPath.slice(0, -1).join(' > '), name: item.name, method, url });
      }
    }
    if (item.item) {
      results = results.concat(findEndpoints(item.item, currentPath));
    }
  }
  return results;
}

const matches = findEndpoints(col.item);
console.log('Found', matches.length, 'matching requests:');
matches.forEach(m => console.log(`[${m.method}] ${m.url} | ${m.folder} > ${m.name}`));

