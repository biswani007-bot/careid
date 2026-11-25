const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items) {
  let results = [];
  for (const item of items) {
    if (item.item) {
      results = results.concat(scanItems(item.item));
    } else if (item.request) {
      const url = item.request.url ? (typeof item.request.url === 'string' ? item.request.url : item.request.url.raw) : '';
      if (url.includes('/token') || url.includes('/login') || url.includes('/impersonate') || url.includes('/auth/')) {
        results.push({
          name: item.name,
          method: item.request.method,
          url
        });
      }
    }
  }
  return results;
}

console.log(scanItems(postman.item));

