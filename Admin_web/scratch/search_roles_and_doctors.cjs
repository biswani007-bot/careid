const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items) {
  let results = [];
  for (const item of items) {
    if (item.item) {
      results = results.concat(scanItems(item.item));
    } else if (item.request) {
      const url = item.request.url ? (typeof item.request.url === 'string' ? item.request.url : item.request.url.raw) : '';
      if (url.includes('/roles') || url.includes('/assign-doctor') || url.includes('/doctors')) {
        results.push({
          name: item.name,
          method: item.request.method,
          url,
          body: item.request.body?.raw
        });
      }
    }
  }
  return results;
}

const reqs = scanItems(postman.item);
console.log(JSON.stringify(reqs, null, 2));

