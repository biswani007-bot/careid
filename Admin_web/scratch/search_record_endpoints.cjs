const fs = require('fs');

// Check live OpenAPI
if (fs.existsSync('scratch/live_openapi.json')) {
  const openapi = JSON.parse(fs.readFileSync('scratch/live_openapi.json', 'utf8'));
  const paths = Object.keys(openapi.paths || {});
  console.log('Total paths in OpenAPI:', paths.length);
  const recordPaths = paths.filter(p => p.toLowerCase().includes('record') || p.toLowerCase().includes('medical') || p.toLowerCase().includes('attach') || p.toLowerCase().includes('timeline') || p.toLowerCase().includes('encounter'));
  console.log('Record-related paths in live OpenAPI:');
  recordPaths.forEach(p => console.log(' ', p, Object.keys(openapi.paths[p])));
} else {
  console.log('scratch/live_openapi.json not found');
}

// Check Postman
const postmanPath = './Postman collection/CareID-Staging.postman_collection.json';
if (fs.existsSync(postmanPath)) {
  const postman = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
  function findRequests(items, prefix = '') {
    const list = [];
    for (const it of items) {
      if (it.request) {
        list.push({ name: prefix + it.name, method: it.request.method, url: typeof it.request.url === 'string' ? it.request.url : it.request.url?.raw });
      }
      if (it.item) {
        list.push(...findRequests(it.item, prefix + it.name + ' > '));
      }
    }
    return list;
  }
  const allReqs = findRequests(postman.item || []);
  console.log('\nTotal requests in Postman:', allReqs.length);
  const recordReqs = allReqs.filter(r => (r.url && (r.url.includes('record') || r.url.includes('attach') || r.url.includes('timeline') || r.url.includes('encounter'))) || r.name.toLowerCase().includes('record'));
  console.log('Record-related requests in Postman:');
  recordReqs.forEach(r => console.log(' ', r.method, r.url, `(${r.name})`));
}

