const fs = require('fs');
const postman = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findItems(items, path = '') {
  for (const item of items) {
    const currentPath = path ? path + ' > ' + item.name : item.name;
    if (item.request) {
      const url = item.request.url?.raw || (item.request.url?.path ? item.request.url.path.join('/') : '');
      const method = item.request.method;
      const query = item.request.url?.query || [];
      const queryParams = query.map(q => q.key + (q.value ? '=' + q.value : '')).join('&');
      if (url.includes('report') || url.includes('dashboard') || url.includes('stat') || url.includes('executive') || url.includes('medical-records') || url.includes('facilities') || url.includes('doctors')) {
        console.log(`[${method}] ${url} | query: [${queryParams}] (${currentPath})`);
      }
    }
    if (item.item) {
      findItems(item.item, currentPath);
    }
  }
}

findItems(postman.item);

