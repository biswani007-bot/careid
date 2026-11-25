const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function scanItems(items, folder = '') {
  let results = [];
  for (const item of items) {
    const currentPath = folder ? `${folder} > ${item.name}` : item.name;
    if (item.item) {
      results = results.concat(scanItems(item.item, currentPath));
    } else if (item.request) {
      const url = item.request.url ? (typeof item.request.url === 'string' ? item.request.url : item.request.url.raw) : '';
      const method = item.request.method;
      if (url.includes('/doctors') && method === 'POST') {
        results.push({
          folder: currentPath,
          name: item.name,
          method,
          url,
          body: item.request.body ? item.request.body.raw : undefined,
          description: item.request.description,
          response: item.response ? item.response.map(r => ({ name: r.name, status: r.status, code: r.code, body: r.body })) : []
        });
      }
    }
  }
  return results;
}

const reqs = scanItems(postman.item);
console.log(JSON.stringify(reqs, null, 2));

