const fs = require('fs');
const col = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReports(items, path = []) {
  let results = [];
  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.request) {
      const url = item.request.url?.raw || (Array.isArray(item.request.url?.path) ? item.request.url.path.join('/') : '');
      const method = item.request.method;
      if (url && (url.toLowerCase().includes('report') || currentPath.some(p => p.toLowerCase().includes('report')))) {
        results.push({ folder: currentPath.slice(0, -1).join(' > '), name: item.name, method, url });
      }
    }
    if (item.item) {
      results = results.concat(findReports(item.item, currentPath));
    }
  }
  return results;
}

const matches = findReports(col.item);
console.log('Found', matches.length, 'reports-related requests in Postman:');
matches.forEach(m => console.log(`[${m.method}] ${m.url} | ${m.folder} > ${m.name}`));

